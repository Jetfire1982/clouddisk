
function filePathStatic(path) {
    return function (req, res, next) {
       //все что мы тут делаем это объекту риквест добавляем новое поле
       req.filePathStatic=path
        next(); //вызовет по цепочке следующий middleware
    }
}


//ну и теперь остается только экспортировать это middleware
module.exports=filePathStatic