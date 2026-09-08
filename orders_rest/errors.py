def problem(status: int, title: str, detail: str):
    return {
        "type": f"https://campuseats.example/problems/{status}",
        "title": title,
        "status": status,
        "detail": detail,
    }
