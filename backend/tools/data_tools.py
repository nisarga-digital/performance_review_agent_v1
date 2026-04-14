"""
Data retrieval tools for the Performance Review Agent.
These tools are registered with LangChain and called by the agent.
"""

import json
import sqlite3
from datetime import datetime, timezone
from difflib import get_close_matches
from pathlib import Path

import pandas as pd
from langchain.tools import tool


BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "sample_data"
REVIEWS_DB_PATH = BASE_DIR / "reviews.sqlite"


def _normalize(text: str) -> str:
    return text.strip().lower()


def _prepare_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _get_reviews_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(REVIEWS_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS self_reviews (
            employee_id TEXT PRIMARY KEY,
            self_rating REAL NOT NULL,
            achievements TEXT NOT NULL,
            strengths TEXT NOT NULL,
            challenges TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS manager_reviews (
            employee_id TEXT PRIMARY KEY,
            manager_rating REAL NOT NULL,
            feedback TEXT NOT NULL,
            rating_change_reason TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


def _load_employee_directory() -> pd.DataFrame:
    frames: list[pd.DataFrame] = []

    for csv_path in DATA_DIR.glob("*.csv"):
        try:
            df = _prepare_df(pd.read_csv(csv_path))
            if {"employee_id", "name"}.issubset(df.columns):
                frames.append(df)
        except Exception:
            continue

    for excel_path in list(DATA_DIR.glob("*.xlsx")) + list(DATA_DIR.glob("*.xls")):
        try:
            workbook = pd.ExcelFile(excel_path)
            for sheet_name in workbook.sheet_names:
                df = _prepare_df(workbook.parse(sheet_name))
                if {"employee_id", "name"}.issubset(df.columns):
                    frames.append(df)
        except Exception:
            continue

    if not frames:
        return pd.DataFrame()

    directory = pd.concat(frames, ignore_index=True)
    directory = directory.drop_duplicates(subset=["employee_id", "name"])
    return directory


def _resolve_employee(query: str) -> dict | None:
    directory = _load_employee_directory()
    if directory.empty:
        return None

    query_lower = _normalize(query)

    if "employee_id" in directory.columns:
        exact_id = directory[
            directory["employee_id"].astype(str).str.strip().str.lower() == query_lower
        ]
        if not exact_id.empty:
            return exact_id.iloc[0].to_dict()

    matches = _search_dataframe(directory, query)
    if matches.empty:
        return None

    best_match = matches.iloc[0].to_dict()
    return best_match


def _validate_rating(value: float, field_name: str) -> float:
    try:
        rating = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a number between 1 and 5.") from exc

    if rating < 1.0 or rating > 5.0:
        raise ValueError(f"{field_name} must be between 1 and 5.")

    return rating


def _require_text(value: str, field_name: str) -> str:
    cleaned = str(value or "").strip()
    if not cleaned:
        raise ValueError(f"{field_name} cannot be blank.")
    return cleaned


def _search_dataframe(df: pd.DataFrame, query: str) -> pd.DataFrame:
    query_lower = _normalize(query)

    if not query_lower:
        return df.head(20)

    # ---- NAME MATCHING (IMPROVED) ----
    if "name" in df.columns:
        df["name_clean"] = df["name"].astype(str).str.strip().str.lower()

        # Exact match
        exact_matches = df[df["name_clean"] == query_lower]
        if not exact_matches.empty:
            return exact_matches

        # Partial match
        partial_matches = df[df["name_clean"].str.contains(query_lower, na=False)]
        if not partial_matches.empty:
            return partial_matches

        # 🔥 FUZZY MATCH (handles SneHa, typos, etc.)
        unique_names = df["name_clean"].unique().tolist()
        close = get_close_matches(query_lower, unique_names, n=5, cutoff=0.6)

        if close:
            return df[df["name_clean"].isin(close)]

    # ---- KEYWORD MATCHING (same as yours) ----
    keywords = [part for part in query_lower.replace(",", " ").split() if part]

    row_text = df.astype(str).agg(" ".join, axis=1).str.lower()

    def count_matches(text):
        return sum(1 for keyword in keywords if keyword in text)

    match_counts = row_text.apply(count_matches)
    has_matches = match_counts > 0

    if not has_matches.any():
        fallback_mask = row_text.str.contains(query_lower, na=False)
        return df[fallback_mask].head(25)

    df_with_counts = df[has_matches].copy()
    df_with_counts["_match_count"] = match_counts[has_matches]

    return df_with_counts.sort_values("_match_count", ascending=False).drop(columns=["_match_count"]).head(25)


@tool
def CSV_Search(query: str) -> str:
    """
    Search for performance data in CSV files using an employee name or natural-language query.
    Use this tool to find rows related to people, ratings, skills, projects, goals,
    feedback, strengths, improvements, years, or trends.
    """
    csv_files = list(DATA_DIR.glob("*.csv"))
    if not csv_files:
        return f"No CSV files found in data directory: {DATA_DIR}"

    all_results = []
    for csv_path in csv_files:
        try:
            df = _prepare_df(pd.read_csv(csv_path))
            matches = _search_dataframe(df, query)
            if not matches.empty:
                all_results.append(
                    f"[Source: {csv_path.name}]\n{matches.to_string(index=False)}"
                )
        except Exception as e:
            all_results.append(f"Error reading {csv_path.name}: {str(e)}")

    if not all_results:
        return f"No records found for '{query}' in any CSV file."

    return "\n\n".join(all_results)


@tool
def Excel_Search(query: str) -> str:
    """
    Search for performance data in Excel files using an employee name or natural-language query.
    Use this tool to find rows related to people, ratings, skills, projects, goals,
    feedback, strengths, improvements, years, or trends.
    """
    excel_files = list(DATA_DIR.glob("*.xlsx")) + list(DATA_DIR.glob("*.xls"))
    if not excel_files:
        return f"No Excel files found in data directory: {DATA_DIR}"

    all_results = []
    for excel_path in excel_files:
        try:
            xl = pd.ExcelFile(excel_path)
            for sheet_name in xl.sheet_names:
                df = _prepare_df(xl.parse(sheet_name))
                matches = _search_dataframe(df, query)
                if not matches.empty:
                    all_results.append(
                        f"[Source: {excel_path.name} | Sheet: {sheet_name}]\n{matches.to_string(index=False)}"
                    )
        except Exception as e:
            all_results.append(f"Error reading {excel_path.name}: {str(e)}")

    if not all_results:
        return f"No records found for '{query}' in any Excel file."

    return "\n\n".join(all_results)


@tool
def save_self_review(
    employee_id: str,
    self_rating: float,
    achievements: str,
    strengths: str,
    challenges: str
) -> str:
    """Save an employee's self-review to the database."""
    employee = _resolve_employee(employee_id)
    if employee is None:
        raise ValueError(f"Employee '{employee_id}' was not found.")

    rating = _validate_rating(self_rating, "self_rating")
    achievements_text = _require_text(achievements, "achievements")
    strengths_text = _require_text(strengths, "strengths")
    challenges_text = _require_text(challenges, "challenges")
    now = _utc_now()

    with _get_reviews_connection() as conn:
        conn.execute(
            """
            INSERT INTO self_reviews (
                employee_id, self_rating, achievements, strengths, challenges, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(employee_id) DO UPDATE SET
                self_rating = excluded.self_rating,
                achievements = excluded.achievements,
                strengths = excluded.strengths,
                challenges = excluded.challenges,
                updated_at = excluded.updated_at
            """,
            (
                str(employee["employee_id"]).strip(),
                rating,
                achievements_text,
                strengths_text,
                challenges_text,
                now,
                now,
            ),
        )

    return json.dumps(
        {
            "status": "success",
            "employee_id": str(employee["employee_id"]).strip(),
            "employee_name": str(employee.get("name", "")).strip(),
            "message": "Self-review saved successfully.",
        }
    )

@tool
def save_manager_review(
    employee_id: str,
    manager_rating: float,
    feedback: str,
    rating_change_reason: str = ""
) -> str:
    """Save a manager's review and rating to the database."""
    employee = _resolve_employee(employee_id)
    if employee is None:
        raise ValueError(f"Employee '{employee_id}' was not found.")

    rating = _validate_rating(manager_rating, "manager_rating")
    feedback_text = _require_text(feedback, "feedback")
    reason_text = str(rating_change_reason or "").strip()

    with _get_reviews_connection() as conn:
        self_review = conn.execute(
            "SELECT self_rating FROM self_reviews WHERE employee_id = ?",
            (str(employee["employee_id"]).strip(),),
        ).fetchone()

        if self_review is None:
            raise ValueError(
                f"Self-review is missing for employee '{employee['employee_id']}'."
            )

        if abs(float(self_review["self_rating"]) - rating) > 0.2 and not reason_text:
            raise ValueError(
                "rating_change_reason is required when manager and employee ratings differ by more than 0.2."
            )

        now = _utc_now()
        conn.execute(
            """
            INSERT INTO manager_reviews (
                employee_id, manager_rating, feedback, rating_change_reason, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(employee_id) DO UPDATE SET
                manager_rating = excluded.manager_rating,
                feedback = excluded.feedback,
                rating_change_reason = excluded.rating_change_reason,
                updated_at = excluded.updated_at
            """,
            (
                str(employee["employee_id"]).strip(),
                rating,
                feedback_text,
                reason_text,
                now,
                now,
            ),
        )

    return json.dumps(
        {
            "status": "success",
            "employee_id": str(employee["employee_id"]).strip(),
            "employee_name": str(employee.get("name", "")).strip(),
            "message": "Manager review saved successfully.",
        }
    )

@tool
def get_self_review(employee_id: str) -> str:
    """Fetch an employee's submitted self-review for the manager to see."""
    employee = _resolve_employee(employee_id)
    if employee is None:
        return json.dumps(
            {"status": "not_found", "employee_id": employee_id, "found": False}
        )

    with _get_reviews_connection() as conn:
        row = conn.execute(
            "SELECT * FROM self_reviews WHERE employee_id = ?",
            (str(employee["employee_id"]).strip(),),
        ).fetchone()

    if row is None:
        return json.dumps(
            {
                "status": "not_found",
                "found": False,
                "employee_id": str(employee["employee_id"]).strip(),
                "employee_name": str(employee.get("name", "")).strip(),
            }
        )

    payload = dict(row)
    payload.update(
        {
            "status": "success",
            "found": True,
            "employee_name": str(employee.get("name", "")).strip(),
        }
    )
    return json.dumps(payload)


@tool
def get_manager_review(employee_id: str) -> str:
    """Fetch an employee's submitted manager review for report generation."""
    employee = _resolve_employee(employee_id)
    if employee is None:
        return json.dumps(
            {"status": "not_found", "employee_id": employee_id, "found": False}
        )

    with _get_reviews_connection() as conn:
        row = conn.execute(
            "SELECT * FROM manager_reviews WHERE employee_id = ?",
            (str(employee["employee_id"]).strip(),),
        ).fetchone()

    if row is None:
        return json.dumps(
            {
                "status": "not_found",
                "found": False,
                "employee_id": str(employee["employee_id"]).strip(),
                "employee_name": str(employee.get("name", "")).strip(),
            }
        )

    payload = dict(row)
    payload.update(
        {
            "status": "success",
            "found": True,
            "employee_name": str(employee.get("name", "")).strip(),
        }
    )
    return json.dumps(payload)

# Export the list of tools for the agent
TOOLS = [
    CSV_Search,
    Excel_Search,
    save_self_review,
    save_manager_review,
    get_self_review,
    get_manager_review,
]
