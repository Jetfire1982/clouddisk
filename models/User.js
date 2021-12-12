const {Schema, model, ObjectId}=require("mongoose");


const User=new Schema({
    email:{type:String, required:true, unique:true},  //т.е. данное поле обязательно и должно быть уникальным
    password:{type:String, required:true},
    diskSpace:{type:Number, default:1024*3*10},
    usedSpace:{type: Number, default:0},
    avatar:{type:String},
    files:[{type:ObjectId, ref:'File'}] //т.е. мы связываем сущность пользователя с сущностью файлов. Тут у нас массив каждый объект которого имеет тип ObjectId и ссылается на сущность файла
})

module.exports=model('User', User);