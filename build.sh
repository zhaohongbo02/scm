#!/bin/zsh

REACT_PROJECT_PATH="."
FLASK_STATIC_PATH="./backend/static/build"

# 检查 Flask 项目路径是否存在
if [ ! -d "$FLASK_STATIC_PATH" ]; then
  echo "Flask static 文件夹不存在: $FLASK_STATIC_PATH"
  exit 1
fi

cd "$REACT_PROJECT_PATH" || exit

echo "开始构建 React 项目..."
npm run build
if [ $? -ne 0 ]; then
  echo "React 项目构建失败！"
  exit 1
fi

# 确认 build 文件夹存在
BUILD_PATH="./build"
if [ ! -d "$BUILD_PATH" ]; then
  echo "构建文件夹不存在: $BUILD_PATH"
  exit 1
fi

# 清空 Flask 的 static 文件夹
echo "清空 Flask static 文件夹..."
rm -rf "$FLASK_STATIC_PATH"
mkdir "$FLASK_STATIC_PATH"
if [ $? -ne 0 ]; then
  echo "清空 Flask static 文件夹失败！"
  exit 1
fi

# 拷贝 build 文件夹内容到 Flask static 文件夹
echo "拷贝 React 构建文件到 Flask static 文件夹..."
cp -r "$BUILD_PATH"/* "$FLASK_STATIC_PATH"/
if [ $? -ne 0 ]; then
  echo "拷贝文件失败！"
  exit 1
fi

# echo "拷贝 bokeh JS文件到 Flask static_folder中..."
# cp -r "$FLASK_STATIC_PATH"/bokeh "$FLASK_STATIC_PATH"/static/
# if [ $? -ne 0 ]; then
#   echo "拷贝文件失败！"
#   exit 1
# fi

echo "拷贝完成！React 项目构建文件已成功复制到 Flask 的 static 文件夹中。"