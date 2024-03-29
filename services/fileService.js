const fs=require('fs'); //модуль предназначенный для работы с файловой системой
const { Promise } = require('mongoose');
const { resolve } = require('path');
const File=require('../models/File');//импорируем модель файла
const config=require('config');
const path = require('path')

class FileService{

    //реализуем ф-ию, которая будет создавать папки. На вход эта ф-ия будет принимать параметр
    //файл - это будет не физический файл, а  именно объект той модели, которую мы будем добавлять в БД
    createDir(req, file){
        //создадим переменную которая будет хранить в себе путь к файлу, который мы будем создавать и первая часть пути это
        //путь к папке files который мы добавили в config. Для каждого пользователя после регистрации будет создаваться
        //папка, которая будет называться по названию айдишника пользователя, а посему во вторую часть пути добавляем этот айдишник
        //т.е. file.user. И также у каждого файла есть относительный путь  и его также приплюсовываем т.е. file.path. 
        //Если файл находится в корневой папке то этот путь (file.path) будет пустым
        // const filePath=`${config.get('filePath')}\\${file.user}\\${file.path}`
        const filePath=this.getPath(req, file)


        //для удобства из этой ф-ии вернем Promise
        return new Promise((resolve, reject)=>{
            try{
                //ниже в условии проверим - если файл по такому пути не существует  то тогда мы будем создавать папку
                if(!fs.existsSync(filePath)){ //вызываем эти ф-ии в синхронном режиме чтобы код выполнялся последовательно
                    fs.mkdirSync(filePath)
                    //в случае успешного создания папки вызываем ф-ию resolve в которую передаем сообщение:
                    return resolve({message: "File was created"})
                } else{
                    //тут обрабатываем случай если файл по такому пути уже существует
                    return reject ({message: "File already exists"})
                }


            }catch(e){
                //сразу же обработаем случай если ошибка всеже возникла
                return reject({message: 'File error'})
            }
        })
    }


    //параметром ф-ия удаления будет принимать модель файла из базы данных
    deleteFile(req, file){
        //в первую очередь определим физический путь до этого файла и поскольку этот путь нам часто необходим
        //логично вынести его получение в отдельную ф-ию getPath (ее определим ниже):
        const path=this.getPath(req, file);
        //В модуле fs, который отвечает за работу с файловой системой файлы и папки отличаются и за их удаление 
        //отвечают разные ф-ии, а посему сделаем условие:
        if(file.type==="dir"){
            fs.rmdirSync(path)
        }else{
            fs.unlinkSync(path)
        }
    }


    //ф-ия получения пути, мы будем получать из req ведь мы в filepath.middleware туда добавили свойство filePath 
    getPath(req, file){
        //file.user - это id пользователя
        console.log("req.filePath = ",req.filePath)
        console.log("file.path = ",file.path)
    
        console.log("req.filePath+file.user+file.path = ",path.join(req.filePath, file.user.toString(), file.path))
        // return req.filePath+'\\'+file.user+'\\'+file.path
        return path.join(req.filePath, file.user.toString(), file.path)
    }

}

module.exports=new FileService(); //т.е. мы экспортировали модель этого класса