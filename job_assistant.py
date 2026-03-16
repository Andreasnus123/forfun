"""
Job Assistant: Find roles bridging project management and technical pre-sales
in the transport sector.

Requirements:
- pdfplumber  (pip install pdfplumber)
- requests    (pip install requests)
- openai      (pip install openai)  — for LLM cover-letter drafting

Environment variables used:
    RESUME_PATH   – absolute path to your PDF resume (default: resume.pdf)
    JSEARCH_KEY   – RapidAPI key for the JSearch job-search API
    OPENAI_API_KEY – OpenAI API key for cover-letter generation
"""

import csv
import os
import re
import sys
from typing import Optional

import pdfplumber
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

RESUME_PATH: str = os.environ.get("RESUME_PATH", "resume.pdf")
JSEARCH_KEY: str = os.environ.get("JSEARCH_KEY", "")
OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")

OUTPUT_CSV: str = "job_results.csv"

SEARCH_QUERIES: list[str] = [
    "Technical Project Manager Transport",
    "Implementation Manager Smart Mobility",
]

BONUS_KEYWORDS: list[str] = [
    "client-facing",
    "hardware deployment",
    "IoT",
    "systems integration",
]

SCORE_THRESHOLD: int = 7

# ---------------------------------------------------------------------------
# Task 1 – Resume extraction
# ---------------------------------------------------------------------------


def extract_resume_text(pdf_path: str) -> str:
    """Extract all text from a PDF resume using pdfplumber."""
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"Resume PDF not found: {pdf_path}")

    text_parts: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return "\n".join(text_parts)


# ---------------------------------------------------------------------------
# Task 2 – Job search via JSearch API (no browser scraping)
# ---------------------------------------------------------------------------


def search_jobs(query: str, api_key: str, num_pages: int = 1) -> list[dict]:
    """Search for jobs using the JSearch API on RapidAPI.

    Args:
        query:    Search query string.
        api_key:  RapidAPI key for JSearch.
        num_pages: Number of result pages to fetch (10 results per page).

    Returns:
        A list of job-result dictionaries from the API.
    """
    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }

    all_jobs: list[dict] = []
    for page in range(1, num_pages + 1):
        params = {"query": query, "page": str(page), "num_pages": "1"}
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        jobs = data.get("data", [])
        all_jobs.extend(jobs)

    return all_jobs


def fetch_all_jobs(api_key: str) -> list[dict]:
    """Fetch jobs for all configured search queries and deduplicate by job_id."""
    seen_ids: set[str] = set()
    combined: list[dict] = []

    for query in SEARCH_QUERIES:
        jobs = search_jobs(query, api_key)
        for job in jobs:
            job_id = job.get("job_id", "")
            if job_id and job_id not in seen_ids:
                seen_ids.add(job_id)
                combined.append(job)

    return combined


# ---------------------------------------------------------------------------
# Task 3 – Job scoring
# ---------------------------------------------------------------------------


def _normalise(text: str) -> str:
    return text.lower()


def _keyword_in_text(keyword: str, text: str) -> bool:
    """Check whether *keyword* appears as a whole phrase in *text*.

    Uses word-boundary anchors so that, e.g., 'iot' does not match 'patriot'.
    Hyphens inside the keyword are treated as literal characters.
    """
    pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"
    return bool(re.search(pattern, text))


def score_job(job: dict, resume_text: str) -> int:
    """Score a job description against the resume on a scale of 1–10.

    Scoring strategy
    ----------------
    Base score (0–6):
      Count how many resume tokens (words ≥ 4 chars) appear in the job
      description.  Scale the match ratio to 0–6.

    Bonus (0–4):
      +1 for each of the BONUS_KEYWORDS found in the job description (max 4).

    The final score is clamped to [1, 10].
    """
    job_text = " ".join(
        [
            job.get("job_title", ""),
            job.get("job_description", ""),
            job.get("employer_name", ""),
        ]
    )
    job_lower = _normalise(job_text)
    resume_lower = _normalise(resume_text)

    # Base score 0–6: scaled match ratio of resume tokens found in the job text.
    # Capped at 6 to leave room for up to 4 bonus points (total max = 10).
    resume_tokens: set[str] = set(re.findall(r"\b[a-z]{4,}\b", resume_lower))
    if not resume_tokens:
        base_score = 0
    else:
        matched = sum(1 for token in resume_tokens if token in job_lower)
        match_ratio = matched / len(resume_tokens)
        base_score = round(match_ratio * 6)

    # Bonus for high-value transport/IoT keywords (word-boundary safe)
    bonus = sum(1 for kw in BONUS_KEYWORDS if _keyword_in_text(_normalise(kw), job_lower))

    raw_score = base_score + bonus
    return max(1, min(10, raw_score))


# ---------------------------------------------------------------------------
# Task 4 – Cover letter drafting via LLM
# ---------------------------------------------------------------------------


def draft_cover_letter(
    job: dict,
    resume_text: str,
    api_key: str,
    model: str = "gpt-4o-mini",
) -> str:
    """Draft a short cover letter using the OpenAI Chat Completions API.

    Args:
        job:         Job dictionary from the search API.
        resume_text: Extracted text of the candidate's resume.
        api_key:     OpenAI API key.
        model:       OpenAI model to use.

    Returns:
        A short cover-letter string.
    """
    job_title = job.get("job_title", "the role")
    employer = job.get("employer_name", "your organisation")
    job_description = job.get("job_description", "")[:2000]  # limit to avoid token-limit issues

    prompt = (
        f"You are a professional career coach.\n\n"
        f"Write a concise, compelling cover letter (3–4 short paragraphs) for "
        f"the following job:\n\n"
        f"Job Title: {job_title}\n"
        f"Employer: {employer}\n"
        f"Job Description (excerpt):\n{job_description}\n\n"
        f"Candidate Resume (excerpt):\n{resume_text[:3000]}\n\n"
        f"The candidate is targeting roles that bridge project management and "
        f"technical pre-sales in the transport sector. Highlight relevant "
        f"experience with client-facing work, hardware deployment, IoT, and "
        f"systems integration where applicable."
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
        "temperature": 0.7,
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


# ---------------------------------------------------------------------------
# Task 5 – CSV output
# ---------------------------------------------------------------------------


def save_results(results: list[dict], output_path: str = OUTPUT_CSV) -> None:
    """Save scored job results to a CSV file.

    Each row contains: job_title, employer, job_url, score, cover_letter.
    """
    fieldnames = ["job_title", "employer", "job_url", "score", "cover_letter"]
    with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"Results saved to {output_path}")


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------


def run(
    resume_path: Optional[str] = None,
    jsearch_key: Optional[str] = None,
    openai_key: Optional[str] = None,
) -> list[dict]:
    """Run the full job-assistant pipeline.

    Args:
        resume_path:  Path to the PDF resume.
        jsearch_key:  RapidAPI / JSearch API key.
        openai_key:   OpenAI API key.

    Returns:
        List of result dictionaries written to the CSV.
    """
    resume_path = resume_path or RESUME_PATH
    jsearch_key = jsearch_key or JSEARCH_KEY
    openai_key = openai_key or OPENAI_API_KEY

    # --- Step 1: Extract resume text ---
    print(f"Extracting resume text from: {resume_path}")
    resume_text = extract_resume_text(resume_path)
    print(f"Extracted {len(resume_text)} characters from resume.")

    # --- Step 2: Fetch jobs ---
    if not jsearch_key:
        print(
            "WARNING: JSEARCH_KEY not set. Skipping job fetch. "
            "Set the JSEARCH_KEY environment variable to enable live job search.",
            file=sys.stderr,
        )
        return []

    print("Fetching jobs from JSearch API…")
    jobs = fetch_all_jobs(jsearch_key)
    print(f"Fetched {len(jobs)} unique job listings.")

    # --- Step 3 & 4: Score and optionally draft cover letters ---
    results: list[dict] = []

    for job in jobs:
        score = score_job(job, resume_text)
        job_url = job.get("job_apply_link") or job.get("job_google_link", "")
        cover_letter = ""

        if score >= SCORE_THRESHOLD:
            if openai_key:
                print(
                    f"Drafting cover letter for: {job.get('job_title')} "
                    f"(score={score})"
                )
                try:
                    cover_letter = draft_cover_letter(job, resume_text, openai_key)
                except requests.RequestException as exc:
                    print(
                        f"  WARNING: Could not draft cover letter for "
                        f"'{job.get('job_title')}' – "
                        f"{type(exc).__name__}: {exc}"
                    )
            else:
                print(
                    "WARNING: OPENAI_API_KEY not set. Skipping cover letter drafting.",
                    file=sys.stderr,
                )

        results.append(
            {
                "job_title": job.get("job_title", ""),
                "employer": job.get("employer_name", ""),
                "job_url": job_url,
                "score": score,
                "cover_letter": cover_letter,
            }
        )

    # --- Step 5: Save results ---
    if results:
        save_results(results)
    else:
        print("No results to save.")

    return results


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    run()
