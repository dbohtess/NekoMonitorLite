import json
import sys
from pathlib import Path

from PySide6.QtCore import QObject, QUrl, Slot
from PySide6.QtGui import QIcon
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication

from system import get_system_info


class Backend(QObject):
    @Slot(result=str)
    def getSystemInfo(self):
        return json.dumps(get_system_info())


app = QApplication(sys.argv)

base_dir = Path(__file__).resolve().parent

window = QWebEngineView()
window.setWindowTitle("NekoMonitor Lite")
window.resize(1200, 800)

icon_path = base_dir / "assets" / "icon.ico"

if icon_path.exists():
    app.setWindowIcon(QIcon(str(icon_path)))
    window.setWindowIcon(QIcon(str(icon_path)))

channel = QWebChannel()
backend = Backend()

channel.registerObject("backend", backend)
window.page().setWebChannel(channel)

html_path = base_dir / "templates" / "index.html"
window.load(QUrl.fromLocalFile(str(html_path)))

window.show()

sys.exit(app.exec())