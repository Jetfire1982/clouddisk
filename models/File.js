const {Schema, model, ObjectId}=require("mongoose");
//ObjectId необходим для связи сущностей

const File=new Schema({
    name:{type:String, required:true},  //это имя файла, имеет строковый тип и является обязательным
    type:{type:String, required:true}, //это тип файла (т.е jpeg, png, zip итд)
    accessLink:{type:String}, //это ссылка доступа, как видим она не обязательна
    size:{type: Number, default:0}, //размер файла и хранить мы его будем в байтах и по умолчанию будет равен нулю
    path:{type:String, default:''}, //это путь к файлу и это строковое значение и по умаолчанию будет равно пустой строке
    date:{type:Date, default:Date.now()}, //дата
    //ниже добавим несколько ссылок 
    user:{type:ObjectId, ref: 'User'}, //ссылаемся на пользователя который добавил файл, в свойство ref мы пишем название модели на которую ссылаемся
    parent:{type:ObjectId, ref: 'File'}, //будет ссылаться на файл, в частности папку в которой он находится
    childs:[{type:ObjectId, ref:'File'}] //ссылается на все файлы которые будут лежать внутри папки
})

module.exports=model('File', File); //т.е. мы импортируем модель и первым параметром передаем
//название модели т.е. "File", а вторым schemу созданную выше т.е. File