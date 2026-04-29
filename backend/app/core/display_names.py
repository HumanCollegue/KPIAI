import json
import threading
from pathlib import Path

_DATA_FILE = Path(__file__).parent.parent.parent / "data" / "display_names.json"
_lock = threading.Lock()


def _read() -> dict:
    try:
        return json.loads(_DATA_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _write(data: dict) -> None:
    _DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    _DATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def get_display_name(legal_name: str) -> str:
    return _read().get(legal_name, legal_name)


def set_display_name(legal_name: str, display_name: str) -> dict:
    with _lock:
        data = _read()
        if display_name.strip() == legal_name.strip() or display_name.strip() == "":
            data.pop(legal_name, None)
        else:
            data[legal_name] = display_name.strip()
        _write(data)
        return data


def get_all_display_names() -> dict:
    return _read()
