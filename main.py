from flask import Flask, jsonify, render_template

from system import get_system_info

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/system")
def system_api():
    return jsonify(get_system_info())


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )