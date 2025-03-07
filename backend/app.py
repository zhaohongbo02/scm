from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.supplychain import supplychain_bp
from routes.supplymap import supplymap_bp
from models import db


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"]}})

# 配置SQLite数据库连接
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///supply_chain.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
	db.create_all()

# 注册蓝图
app.register_blueprint(supplychain_bp)
app.register_blueprint(supplymap_bp)

@app.route('/')
def serve_react():
	return send_from_directory(app.template_folder, 'index.html')

if __name__ == '__main__':
	app.static_folder = 'static/build/static', 
	app.template_folder='static/build'    
	app.run(debug=False, use_reloader=False)
