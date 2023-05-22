const {Schema, model, ObjectId}=require("mongoose");

//mongoose уже по умолчанию создает айдишники, а посему начинаем сразу с email:
const User=new Schema({
    email:{type:String, required:true, unique:true},  //т.е. данное поле обязательно и должно быть уникальным
    password:{type:String, required:true},
    diskSpace:{type:Number, default:1024*146484},  //150мб выделил
    usedSpace:{type: Number, default:0},
    avatar:{type:String},
    files:[{type:ObjectId, ref:'File'}] //т.е. мы связываем сущность пользователя с сущностью файлов. Тут у нас массив каждый объект которого имеет тип ObjectId и ссылается на сущность файла
})

module.exports=model('User', User);