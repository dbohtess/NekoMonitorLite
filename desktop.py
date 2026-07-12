import sys
from pathlib import Path

from PySide6.QtWidgets import QApplication
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtGui import QIcon

app = QApplication(sys.argv)

window = QWebEngineView()

icon = Path("assets/icon.ico")
if icon.exists():
    app.setWindowIcon(QIcon(str(icon)))
    window.setWindowIcon(QIcon(str(icon)))

html = Path("templates/index.html").resolve()

window.load(html.as_uri())

window.setWindowTitle("NekoMonitor Lite")
window.resize(1200, 800)
window.show()

sys.exit(app.exec())