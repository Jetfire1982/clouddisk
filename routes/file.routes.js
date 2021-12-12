const Router = require("express");
// const User = require("../models/User"); //импортируем модель пользователя
// const bcrypt = require("bcrypt"); //модуль безопасности для хеширования паролей
// const { check, validationResult } = require("express-validator"); //модуль для валидации данных
// const config=require("config"); //этот модуль позволит нам в json файле создавать какие то настройки а затем получать их где надо, например мы получили оттуда номер порта
// const jwt=require("jsonwebtoken");
const authMiddleware=require("../middleware/auth.middleware"); //будет идентифицировать пользователя по токену
const fileController=require('../controllers/fileController');

const router = new Router(); //создаем объект роутрер


//ниже создаем post запрос, без url (точнее это будет /api/files), который в качестве второго параметра принимает middleware для того чтобы 
//иденцифицировать пользователя и поскольку fileController это уже объект, (который мы экспортировали из fileController.js) то мы можем у него 
//вызвать метод createDir которая и будет третьим параметром в post запросе
router.post('', authMiddleware, fileController.createDir) //теперь когда мы из postman пошлем запрос 
//на http://localhost:5000/api/auth/registration т.е. регистрация нового пользователя 
//{"email":"qwerty@mail.ru", "password":"1234"} то в папке files будет созадана папка с названием айдишника
//только что зарегистрированного пользователя (это сработает метод сreateDir из auth.routes.js)
//Потом залогиниваемся через postaman т.е. отравляем пост запрос уже не на regisration а на login т.е.
//на http://localhost:5000/api/auth/login c данными при регистрации {"email":"qwerty@mail.ru", "password":"1234"}. В ответе
//мы получаем токен и юзера. Копируем токен и попробуем создать папку. Это будет пост запрос по адресу:
//localhost:5000/api/files. Заходим в постмане в Authorization, выбираем TYPE вида Bearer Token и вставляем токен. Далее с 
//Authorization переходим к телу запроса т.е. к Body, выбираем формат json и пишем в теле имя папки и тип (в типе указываем
//что у нас директория): {"name":"first_dir", "type":"dir"}, итак отправляем и получаем всю информацию о файле:
// {
//     "size": 0,
//     "path": "first_dir",
//     "childs": [],
//     "_id": "6134aa22f659b034f8294995",
//     "name": "first_dir",
//     "type": "dir",
//     "user": "6131eb470b282630245727eb",
//     "__v": 0
// }
//Теперь если мы перейдем в проект то в папке с айдишнкиком пользователя которую мы сделали ранее появилась папка fist_dir
//которую мы передали в последнем запросе. Можно создать еще одну папку.
//Теперь можно попробовать создать какую-нибудь вложенную папку нопример сделаем вложенную папку в созданную выше first_dir -
//для этого копируем полученный _id т.е в данном случае он равен 6134aa22f659b034f8294995 и составляем body уже с полем
//parent в которое мы и поместим тот id т.е. будет:
//  {"name":"inner_dir",  "type":"dir",  "parent":"6134aa22f659b034f8294995"}


//ниже рут для получения файлов т.е. это будет уже get запрос. Не забываем что у get метода 
//нету тела запроса поэтому в postmanе убираем body т.е. выбираем поле "none" и отправляем по
//адресу localhost:5000/api/files а что бы получить вложенную папку то нам нужно скопировать айдишник
//родительсокй папки и добавить ее в строку запроса например:
// localhost:5000/api/files?parent=613740d92fc4082c645c8b56 
router.get('', authMiddleware, fileController.getFiles)


router.post('/upload', authMiddleware, fileController.uploadFile)
//теперь также мы можем в postman залогиниться, копируем токен, затем набираем POST по адресу localhost:5000/api/files/upload. 
//В authorization выбираем Bearer Token и вставляем наш токен. Далее переходим к телу запроса - выбираем FormData. В key пишем
//file тут же указываем что это файл а не текстовые данные а в value выбираем любой файл. Пробуем отправить запрос и получаем 
//какие то данные - значит запрос прошел успешно. И теперь если мы посмотрим в папку пользователя то увидим в корне наш файл.
//Так же можно потренить передавать файл во вложенную папку. Для начала создадим какую-нубудь папку и получим ее айдишник -
//для этого по адресу localhost:5000/api/files отправляем тело в формате json {"name":"dirname", "type":"dir"}. Отправляем и
//в корневой директории появляется папку dirname. Копируем в postmane в ответе айдишник этой папки и теперь дополнительно к тому 
//что мы делали выше при отправке файла в formData дополнительно указываем новое поле т.е. в key записываем parent и в value 
//записываем айдишник. Отправляем и теперь в папке dirname появился файл который мы отравили 

//добавим рут по загрузке аватара
router.post('/avatar', authMiddleware, fileController.uploadAvatar)
//ниже запрос на удаление аватара пользователя:
router.delete('/avatar', authMiddleware, fileController.deleteAvatar)


//добавим рут для загрузки файла с сервера
router.get('/download', authMiddleware, fileController.downloadFile)


//добавим рут для поиска файла:
router.get('/search', authMiddleware, fileController.searchFile)

//добавим запрос на удаление - это будет delete запрос, он похож на get и не имеен тела запроса, а все параметры передаются через строку
router.delete('/', authMiddleware, fileController.deleteFile)

module.exports=router;