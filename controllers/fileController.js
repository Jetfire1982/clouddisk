//тут уже будем работать непосредственно с запросом
const fileService = require('../services/fileService')  //экспортируем ранее созданный сервис
const User = require('../models/User') //экспортируем сущность пользователя
const File = require('../models/File') //экспортируем сущность файла
const config = require('config')
const fs = require('fs')
const Uuid = require('uuid');
const p  = require('path')




class FileController {
    //создаем асинхронную ф-ию которая в качестве параметров принимает запрос и ответ, подобные ф-ии мы уже создавали
    //когда работали с аутентификацией
    async createDir(req, res) {
        try {
            //из тела запроса получим название файла, его тип а также родительскую папку
            const { name, type, parent } = req.body;
            console.log('name=', name)
            console.log('type=', type)

            //ниже создадим новый файл и передадим в него все эти данные, а id пользователя получим из поля user,
            //который мы добавляем когда распарсиваем токен (в auth.middleware у нас есть строка декодирования токена req.user=decoded)
            const file = new File({ name, type, parent, user: req.user.id })
            console.log('parent=', parent)
            //теперь по айдишнику полученному из запроса найдем родительский файл точнее это не файл а объект с инофрмацией.
            //Если мы не передали parent т.е. он будет undefined то parentFile будет null
            const parentFile = await File.findOne({ _id: parent })
            console.log('parentFile=', parentFile)
            //и в зависимости от того найден ли был родительский файл или нет путь будет отличаться:
            if (!parentFile) { //если родительский файл не был найден то это означает что файл будет добавлен в корневую директорию
                //т.е. в папку название которой есть айдишник, а посему в поле path добавляем только имя файла:
                file.path = name
                await fileService.createDir(req, file) //создаем директорию
            } else {
                //если же родительский файл был все же найден то тогда сперва мы добавляем родительский путь и к нему приплюсовываем 
                //имя файла:
                
                // file.path = `${parentFile.path}\\${file.name}`

                file.path = p.join(parentFile.path, file.name)

                await fileService.createDir(req, file) //создаем директорию
                //теперь в массив родительского файла childs пушим id только что созданного нового файла т.к. он будет явяться по
                //отношению к родительскому файлу дочерним:
                parentFile.childs.push(file._id)
                await parentFile.save() //после всех этих операций сохраняем родительский файл
            }
            await file.save() //сохраняем сам файл и строкой ниже возвращаем его в ответе от сервера
            return res.json(file)
        } catch (e) {
            console.log(e)
            return res.status(400).json(e) //т.е. в случае ошибки отправляем ответ от сервера с сообщением ошибкой
        }
    }


    //ниже реализуем функцию получения файлов:
    async getFiles(req, res) {
        try {
            //искать файл мы будем по айдишнику пользователя и айдишнику родительской папки в которой
            //эти файлы находятся. Айди пользователя мы все также получаем из токена в auth.middleware.js
            //а айди родительской папки будем получать параметром из строки запроса (это делается
            //чтобы получить вложенную папку), но он может и отсутствовать и посему мы
            // по айди пользователя вернем просто все что касается пользователя

            //реализуем логику сортировку и поскольку это get запрос то мы будем передавать информацию о сортировки
            //через строку запроса и в зависимости от того какую сортировку мы передали (тип, имя или дата) мы
            //будем возрвращать разные данные
            const { sort } = req.query
            let files
            switch (sort) {
                case 'name':

                    //для того чтобы получить уже отсортированный массив с базы данных воспользуемся функцией sort
                    //в которую параметром передаем объект в котором указываем название поля по которому идет сортировка
                    //и направление по которому эта сортировка идет по убыванию это 1 и по возрастанию -1
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ name: 1 })
                    break;
                case 'type':
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ type: 1 })
                    break;
                case 'data':
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ date: 1 })
                    break;
                default: //по дефолту мы будем возвращать файлы в таком же виде как и раньше
                    files = await File.find({ user: req.user.id, parent: req.query.parent })
                    break;
            }


            

            //полученные файлы ответом вернем обратно на клиент:
            return res.json(files) //т.е. веренем массив объектов



        } catch (e) {
            console.log(e)
            return res.status(500).json({ message: "Can not get files" })
        }
    }


    //ниже делаем функцию загрузки файла и в качестве параметров она как обычно принимает запрос и ответ
    async uploadFile(req, res) {
        try {

            const file = req.files.file //т.е. из массива files (наверное всеже объект files) получаем объект с названием file
            // (там может быть абсолютно любое название но мы в запросе указывали именно file)
            const parent = await File.findOne({ user: req.user.id, _id: req.body.parent })  //теперь найдем родительскую директорию 
            //в которой мы будем сохранять этот файл - 
            //ищем мы по айдишнику пользователя,
            //который мы достаем из токена и по адишнику
            // самой директории которую мы будем передавать
            // в теле запроса.
            //теперь найдем самого пользователя - он нужен нам для того чтобы проверить есть ли у него свободное место на диске или нет
            const user = await User.findOne({ _id: req.user.id })

         

            //теперь ниже в условии проверим - если занятое на диске место + размер файла больше чем весь размер диска то вернем на
            //клиент сообщение о том что на диске нет свободного места:
         
            
            if (user.usedSpace + file.size > user.diskSpace) {
               
                return res.status(400).json({ message: "There is no space on the disk" })
            }
            //если же место всеже есть то прибавляем размер файла к текущей заполенности диска:
            user.usedSpace = user.usedSpace + file.size
            //далее разберемся с путем по которому мы будем сохранять файл - в зависимости от того найден родительский файл или нет путь
            //будет отличаться
            let path;
            if (parent) {
                path = `${req.filePath}\\${user._id}\\${parent.path}\\${file.name}`

                path = p.join(req.filePath, user._id.toString(), parent.path, file.name)

                console.log("UPLOAD to path with parent = ",p.join(req.filePath, user._id.toString(), parent.path, file.name))
            } else {
                // path = `${req.filePath}\\${user._id}\\${file.name}`  //т.е. если parent не указан то закидываем в корень т.е. в папку с id пользователя
              
                // return req.filePath+'\\'+file.user+'\\'+file.path
                console.log("UPLOAD to path = ",p.join(req.filePath, user._id.toString(), file.name))
                path = p.join(req.filePath, user._id.toString(), file.name)
            }

           

            //ниже проверим существует ли файл с таким названием по такому пути:
            if (fs.existsSync(path)) {
                console.log("0 error")
                return res.status(400).json({ message: "File already exists" })
            }
            console.log("1!")
            //ниже с помощью ф-ии mv переместим наш файл по ранее созданному пути:
            file.mv(path)
            console.log("2!")

            if(parent){
            fs.readdir(p.join(req.filePath, user._id.toString(), parent.path), (err, files)=>{
                if (err) throw err;
            
                console.log("FILES from user when upload and we have parent = ",files);
            })
        }else{
            // console.log("!->req.filePath = ",req.filePath)
            // console.log("!->user._id.toString() = ",user._id.toString())
            // console.log("!->file.name = ",file.name)
            fs.readdir(p.join(req.filePath, user._id.toString()), (err, files)=>{
                if (err) throw err;
            
                console.log("FILES from user when upload and we do not have parent = ",files);
            })

        }

            //теперь получим тип файла, а именно его расширение. И поскольку нам нужно слово после последней точки, а точек в названии может
            //быть несколько то разделим название файла по точкам с помощъю ф-ии split и так как результатом будет массив то заберем последний
            //элемент с помощью ф-ии pop:
            console.log("3!")
            const type = file.name.split('.').pop()  //свойство name есть в объекте file - там много всякого 
            //и получается это благадоря расширению fileUpload который мы устанавливаем в главном index.js.
            //это расширение позволяет работать с файлами из formData
            //теперь зоздадим модель файла который мы будем уже непосредственно сохранять уже в базе данных и передадим туда все необходимые 
            //параметры - название, тип, родителя итд.:
            console.log("4! type=", type)
            let filePath = file.name
            //ниже для пути файла, опрделенного выше, добавим родительский путь в случае если есть родитель, а если же его нет то
            //мы оставим просто название файла
            if (parent) {
                // filePath = parent.path + "\\" + file.name
                filePath=p.join(parent.path, file.name)
            }


            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: filePath,
                parent: parent ? parent._id : null,
                // parent,
                // path:'',
                // parent:null,
                user: user._id
            })
            console.log("5!")
            //теперь остается сохранить этот файл в бд и поскольку мы также изменяли поля пользователя его также необходимо сохранить:
            await dbFile.save()
            console.log("6!")
            await user.save()
            console.log("7!")
            //и последним этапом мы отправляем данные о файле обратно на клиент:
            res.json(dbFile)

        } catch (e) {
            console.log("Ошибка=", e)
            return res.status(500).json({ message: "Upload error" })
        }
    }


    async downloadFile(req, res) {
        try {
            console.log("here")
            //в первую очередь нам нужно получить файл из базы данный, получать будем по id файла а сам айдишник будем передавать
            //параметром через строку запроса и также чтобу убедиться что владелец этого файла пользователь который отправил
            //запрос укажем еще и id пользователя (его как мы помним мы получаем из токена, который передаем в заголовке authorization):
            const file = await File.findOne({ _id: req.query.id, user: req.user.id })
            //итак файл с базы данных мы получили - теперь необходимо определить путь до физического файла который хранится на сервере т.е.
            //мы берем из конфигурационного файла путь к директории с файлами, далее в папке с файлами у нас хранятся папки с названиями
            //в виде айдишника каждого пользователя т.е. добавляем req.user.id, далее из файла полученного из БД приплюсовываем путь т.е.
            //это уже путь относительно директории пользователя и добавляем непосредственно имя файла:
            // const path=config.get('filePath')+'\\'+req.user.id+'\\'+file.path
            //для получения пути мы написали ф-ию getPath
            const path = fileService.getPath(req, file)
            console.log("path download = ",path)
            //теперь проверим что если файл по данному пути существует то мы должны отправить его обратно на клиент, есть множество способов
            //реализовать такой функционал, но восопльзуемся функцией download куда мы первым параметром передаем путь к файлу, а вторым
            //имя файла
            if (fs.existsSync(path)) {
                console.log("Exist file.name = ", file.name)
                return res.download(path, file.name)
            }

            
            fs.readdir(p.join(req.filePath, file.user.toString()), (err, files)=>{
                if (err) throw err;
            
                console.log("FILES from user = ",files);
            })


            console.log("No exist")

            //и в случае если файл всеже был не найден отправим какое нибудь сообщение на клиент:
            return res.status(400).json({ message: "Download error" })


        } catch (e) {
            console.log("Ошибка=", e)
            return res.status(500).json({ message: "Download error" })
        }
    }

    async deleteFile(req, res) {
        try {
            //получаем файл из базы данных по id который мы получаем из строки запроса и пользователя, которого
            //мы получаем как и прежде из токена
            const file = await File.findOne({ _id: req.query.id, user: req.user.id })
           
            //если файл не был найден то оповестим об этом клиента:
            if (!file) {
                return res.status(400).json({ message: 'file not found' })
            }
            //далее в первую очередь нам надо попробовать удалить физический файл, который хранится на сервере:
            fileService.deleteFile(req, file)
            //и если физический файл удалился тогда мы удаляем модель файла из базы данных и
            //оповещаем об этом пользователя:
            await file.remove()
            return res.json({ message: "File was deleted" })


        } catch (e) {
            console.log(e)
            //в случае ошибки будем отправлять какое-то сообщение клиенту. Т.к. мы не сделали рекурсивное удаление файлов внутри папки то
            //nodejs не даст удалить папку в которой есть уже какие то файлы - она должна быть пуста для удаления и скорее всего ошибка может
            //возникнуть только в этом случае
            return res.status(400).json({ message: 'Dir is not empty' })
        }
    }


    //ниже реализуем функционал поиска файлов:
    async searchFile(req, res) {
        try {
            //в первую очередь из поисковой строки получим параметр search и 
            //это будет именно слово по которому мы будем искать:
            const searchName = req.query.search
            //и по скольку нам придется искать файлы по каким то отдельным кускам названия то
            //нам необходимо получить все файлы которые есть у пользователя и среди них уже 
            //будем осуществлять поиск уже на сервере, а не в самой БД:
            let files = await File.find({ user: req.user.id })
            //выше получилил все эти файлы (кстати заменили const на let чтобы можно было их менять) 
            //теперь проведем фильтрацию т.е. проверим включает ли название файла в себя searchName и если
            //это так то файл попадает в итоговый массив т.е. мы логику реализовываем таким образом что
            //даже если мы напишем какую то центральную часть названия то он все равно попадет в результат и
            //соответственно пользователь сможет его найти:
            files = files.filter(file => file.name.includes(searchName))
            //ну и теперь остается только файлы вернуть обратно:
            return res.json(files)


        } catch (e) {
            console.log(e)
            return res.status(500).json({ message: "Search error" })
        }
    }


    //ниже реализуем ф-ию для загрузки аватара и как обычно это асинхронная ф-ию которая параметрами принимает запрос и ответ
    async uploadAvatar(req, res) {
        try {
          
          
            //в первую очередь мы должны получить файл из запроса и это и будет собственно аватарка
            const file = req.files.file
            //теперь нам нужно получить самого пользователя из базы данных:
            const user = await User.findById(req.user.id) //напомню что этот id мы получаем из токена 
            //следующим этапом необходимо сгенерировать абсолютно рандомное название для файла чтобы он был уникальным и для
            //этого обращаемся к библиотеке uuid и в ней вызываем модуль v4. Строка в переменной avatarName будем примерно
            //в таком виде: "9b1deb4d-3b7d-4bad-9bdd-2bod7b3dcb6d" ну и далее мы к этой строке добавим ".jpg"
            const avatarName = Uuid.v4() + ".jpg"
            //далее у файла вызываем ф-ию mv (от слова move) и параметром передаем путь по которому мы этот файл будем перемещать
            // file.mv(config.get('staticPath') + "\\" + avatarName)
            
            //ниже мы получаем путь к статичной папке который мы задаем в filepathStatic.middleware.js
            file.mv(req.filePathStatic + "/" + avatarName)
           
            console.log("TEST=",req.filePathStatic + "/" + avatarName)
            //и в моделе пользователя мы создавали поле avatar и в него мы как раз добавим название аватарки которое сгенерировали:
            user.avatar = avatarName
            console.log("avatarName = ",avatarName)
            //теперь пользователя сохраняем:
            await user.save()
            // return res.json({ message: "Avatar was uploaded" })
            //лучше вместо сообщения будем возвращать пользователя:
            
            return res.json(user)
        } catch (e) {
            console.log(e)
            return res.status(500).json({ message: "Upload avatar error" })
        }
    }


    //но если пользователь загрузил аватарку ему нужно также предоставить эту аватарку удалить:
    async deleteAvatar(req, res) {
        try {
            //получаем пользователя
            const user = await User.findById(req.user.id) //напомню что этот id мы получаем из токена 
            //нам нужно удалить физический файл с компьютера и для этого мы обращаемся к модулю fs и вызываем 
            //у него ф-ию unlinkSync в которую передаем путь к файлу:
            fs.unlinkSync(req.filePathStatic + "/" + user.avatar)
           
            //теперь мы присваиваем полю avatar значение null:
            user.avatar=null
            //теперь пользователя сохраняем:
            await user.save()
            //и в ответ на клиент будем отправлять не сообщение а прямо исправленного пользователя:
            return res.json(user)

        } catch (e) {
            console.log(e)
            return res.status(500).json({ message: "Delete avatar error" })
        }
    }


}


//сразуже экспортируем объект данного класса
module.exports = new FileController()