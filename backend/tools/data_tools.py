"""
Data retrieval tools for the Performance Review Agent.
These tools are registered with LangChain and called by the agent.
"""

import pandas as pd
from pathlib import Path
from langchain.tools import tool

DATA_DIR = Path(__file__).parent.parent / "sample_data"


def _normalize(text: str) -> str:
    return text.strip().lower()


def _prepare_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df


def _search_dataframe(df: pd.DataFrame, query: str) -> pd.DataFrame:
    """Search across the name column first, then across all row text."""
    query_lower = _normalize(query)
    if not query_lower:
        return df.head(20)

    if "name" in df.columns:
        names = df["name"].dropna().unique()
        matched_names = [n for n in names if str(n).strip().lower() in query_lower]
        if matched_names:
            return df[df["name"].isin(matched_names)]
            
        name_mask = df["name"].astype(str).str.strip().str.lower().str.contains(query_lower, na=False)
        name_matches = df[name_mask]
        if not name_matches.empty:
            return name_matches

    keywords = [part for part in query_lower.replace(",", " ").split() if part]
    if not keywords:
        return df.head(20)

    row_text = df.astype(str).agg(" ".join, axis=1).str.lower()
    
    def count_matches(text):
        return sum(1 for keyword in keywords if keyword in text)
        
    match_counts = row_text.apply(count_matches)
    has_matches = match_counts > 0
    
    if not has_matches.any():
        fallback_mask = row_text.str.contains(query_lower, na=False)
        matches = df[fallback_mask]
        return matches.head(25)
    
    df_with_counts = df[has_matches].copy()
    df_with_counts['_match_count'] = match_counts[has_matches]
    return df_with_counts.sort_values('_match_count', ascending=False).drop(columns=['_match_count']).head(25)


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


# Export the list of tools for the agent
TOOLS = [Excel_Search, CSV_Search]
