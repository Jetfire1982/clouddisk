//тут сделаем функционал который позволит отправлять любые виды запросов с любых доменов
function cors(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET");
    res.header("Access-Control-Allow-Methods", "PUT");
    res.header("Access-Control-Allow-Methods", "PATCH");
    res.header("Access-Control-Allow-Methods", "POST");
    res.header("Access-Control-Allow-Methods", "DELETE");
    // res.header("Access-Control-Allow-Methods", "GET", "PUT", "PATCH", "POST", "DELETE"); //почему то именно метод delete при такой записи не видим CORS
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization"); //чтобы было разрешение для хедера Authorization а не только Content-Type добавляем его через запятую
    next(); //вызовет по цепочке следующий middleware
}

module.exports=cors;