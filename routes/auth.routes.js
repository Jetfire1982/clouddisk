//в этом файле будут содержаться маршруты, которые обрабатывают регистрацию и авторизацию пользователя
const Router = require("express");
const User = require("../models/User"); //импортируем модель пользователя
const bcrypt = require("bcrypt"); //модуль безопасности для хеширования паролей
const { check, validationResult } = require("express-validator"); //модуль для валидации данных т.к. на сервер могут отправить
                                                                  //пустой пароль или не валидный email и вот модуль expres-validator 
                                                                  //помогает провалидировать данные
const config=require("config"); //этот модуль позволит нам в json файле создавать какие то настройки а затем получать их где надо, например мы получили оттуда номер порта
const jwt=require("jsonwebtoken");
const authMiddleware=require("../middleware/auth.middleware");

//Нам нужно сделать так чтобы при регистрации для каждого пользователя создавалась папка в которой будут храниться
//все его файлы для этого ниже импортируем сюда fileService:
const fileService=require("../services/fileService")
const File=require("../models/File")

const fs = require('fs')
const path = require('path')


const router = new Router(); //создаем объект роутрер

router.post('/registration',
    [ //т.е. вторым параметром ф-ии post передадим массив
        ////в ф-ию check первым параметром передаем поле которое надо валидировать email, а вторым параметром сообщение с ошибкой и далее 
        //вызываем метод isEmail т.е. валидируем это поле как Email
        check("email", "Uncorrect email").isEmail(),
        //ниже точно также как и выше email мы провалидируем пароль, но пароль проволидируем по длине чтобы он был длиннее 3 но короче 12
        check("password", "Password must be longer than 3 ad shorter than 12").isLength({ min: 3, max: 12 })
    ],
    async (req, res) => {
        try {
            console.log(req.body)
            //ниже с помощью ф-ии validationResult получим результат валидации и в параметр ф-ии передаем запрос.
            //Какие данные валидируем мы указали выше в аргументах через ф-ию check 
            const errors = validationResult(req)
            //и если теперь результат валидации выше содержит какие-либо ошибки то тогда вернем статус код 400 и добавим сообщение
            //что произошла ошибка при регистрации:
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: "Uncorrect request", errors })
            }


            const { email, password } = req.body //получаем email и пароль из тела запроса 
            const candidate = await User.findOne({ email })//теперь необходимо проверить существует ли пользователь с таким email в базе и не забываем что все ф-ии из БД асинхронные
            if (candidate) {
                return res.status(400).json({ message: `User with email ${email} already exists` })
            }
            //ну а если условие выше не сработало то мы можем создавать нового пользователя
            /*ВАЖНО! Мы не можем сохранять пароль в исходном виде в БД - для этого нам необходимо его захешировать в целях
            безопасности для этого устанавливаем модуль bcrypt. Метод hash вторым параметром принимает степень хеширования, чем
            она выше тем дольше будет хешироваться пароль*/
            const hashPassword = await bcrypt.hash(password, 8)  //ф-ия hash асинхронная а посему добавляем async await, 8 - это мы указали степень хеширования пароля, чем выше тем дольше может быть процесс хеширования и соответственно дехеширования
            const user = new User({ email, password: hashPassword }) //т.е. мы добавили пользователю захешированный пароль
            await user.save(); //ну и теперь сохраняем пользователя в БД и это тоже асинхронная операция а посему добавляем await
            //после того как пользователь был сохранен в БД создаем для него отдельную папку название которой будет айдишник пользователя:
            await fileService.createDir(req, new File({user:user.id, name:''})) //тут мы просто создаем папку и после создания идем дальше
            

            return res.json({ message: "User was created" }) //возвращаем ответ от сервера




        } catch (e) {
            console.log(e)
            // res.send({ message: "Server error" })  //т.е. мы будем выводить ошибку в логе и отравлять пользователю сообщение
            res.status(500).json({message:"Server error! We are doing our best to fix it"})
        }
    }
)


router.post('/login',
    async (req, res) => {
        try {

            fs.readdir(path.resolve(__dirname, '..', 'static'), (err, files)=>{
                if (err) throw err;
            
                console.log("STATIC INSIDE from login = ",files);
            })

            fs.readdir(path.resolve(__dirname, '..', 'files', '643fb841262a202b048e74e0'), (err, files)=>{
                if (err) throw err;
            
                console.log("FILES/643fb841262a202b048e74e0 inside from login = ",files);
            })

            fs.readdir(path.resolve(__dirname, '..'), (err, files)=>{
                if (err) throw err;
            
                console.log("DIR from login = ",files);
            })

           const{email, password}=req.body
            const user=await User.findOne({email}) //пробуем найти юзера по email
            if(!user){ //т.е. если пользователь не будет найден то вернем ошибку
                return res.status(404).json({message:"User is not found"})
            }
            //если же пользователь был найден то нам необходимо сравнить пароль из запроса с паролем в БД
            //но т.к. пароль в БД хранится в зашифрованном виде нам понадобится модуль bcrypt и функция compareSync, которая
            //сравнивает незашифрованный пароль с зашифрованным и если пароли совпадают то функция верент true
            const isPassValid=bcrypt.compareSync(password, user.password)
            //если же пароли не совпадают отправим ошибку с сообщением о некоректности пароля:
            if(!isPassValid){
                return res.status(400).json({message:"Invalid password!"})
            }
            //теперь нам понадобится тот самый JWTOKEN 
            //воспользуемся этой библиотекой и создадим сам токен - вызовем ф-ию sign который принимает три параметра:
            //первым параметром мы передаем объект с данными который мы хотим поместить в токен и в нашем случае это id пользователя.
            //теперь в default.json создадим секретный ключ ("secretKey") по которому будет происходить шифрование - секретный ключ
            //может быть абсолютно любым. И этот секретный ключ передадим вторым параметром в ф-ию sign. Третьим параметром передадим
            //объект в котором укажем сколько времени будет токен существовать
            const token=jwt.sign({id:user.id},config.get("secretKey"), {expiresIn:"1h"})
            //после создания токена нам необходимо вернуть его обратно на клиент. Вернем также некие данные о юзере за исключением
            //пароля
            return res.json({
                token,
                user:{
                    id: user.id,
                    email: user.email,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar 
                }
            })
        } catch (e) {
            console.log(e)
                //  res.send({ message: "Server error!!!" })  //т.е. мы будем выводить ошибку в логе и отравлять пользователю сообщение
                res.status(500).json({message:"Server error! We are doing our best to fix it"})
        }
    }
)



//Наш authMiddleware передаем вторым параметром в ф-ию ниже. 
//Обрати внимание тут уже get т.к. мы только получаем данные на клиенте и ничего не отправляем
router.get('/auth', authMiddleware, 
    async (req, res) => {
        try {
            //ниже получаем пользователя по тому id который мы достали из токена, ведь мы в auth.middleware.js
            //поместили в поле user данные из токена - объект decoded т.е. там есть строка: req.user=decoded
          const user=await User.findOne({_id: req.user.id}) //заметь что Mongo по умолчанию ставит нижнее подчеркивание перед id поэтому и мы его указываем
          //теперь перезапишем токен:
          const token=jwt.sign({id:user.id},config.get("secretKey"), {expiresIn:"1h"})
          //после создания токена нам необходимо вернуть его обратно на клиент. Вернем также некие данные о юзере за исключением
          //пароля
          return res.json({
              token,
              user:{
                  id: user.id,
                  email: user.email,
                  diskSpace: user.diskSpace,
                  usedSpace: user.usedSpace,
                  avatar: user.avatar 
              }
          })
        } catch (e) {
            console.log(e)
            res.status(500).json({message:"Server error! We are doing our best to fix it"}) //т.е. мы будем выводить ошибку в логе и отравлять пользователю сообщение
        }
    }
)

module.exports=router;


