def problem(title, status, detail, type_="about:blank"):
    return {
        "type": type_,
        "title": title,
        "status": status,
        "detail": detail,
    }
