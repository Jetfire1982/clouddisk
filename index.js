// console.log("hello world");
const express=require("express");
const mongoose=require("mongoose");
const config=require("config"); //этот модуль позволит нам в json файле создавать какие то настройки а затем получать их где надо, например мы получили оттуда номер порта

const fileUpload=require("express-fileupload");

const authRouter=require("./routes/auth.routes.js");
const fileRouter=require("./routes/file.routes.js"); 

const app=express() //создаем объект приложения
const PORT=process.env.PORT || config.get('serverPort') //Если в системных переменных определена константа PORT то получаем ее,
                                                        // а если нет то получаем значение по ключу из папки config 
                                                        //и файла default.json. Т.к. хероку сам задает эту переменную то нам 
                                                        //необходимо сделать именно так
const corsMiddleware=require("./middleware/cors.middleware")

//экспортируем миддлвэейр который мы сделали перед деплоем:
const filePathMiddleware=require('./middleware/filepath.middleware')
//импортируем стандартный модуль NODE.JS который называется path и который правильно преобразовывает путь для всех
//операционных систем: 
const path=require('path')
//и теперь в миддлэевейре filePathMiddleware применем этот модуль и его метод resolve в который 
//передаем __dirname (путь к текущей директории) и вторым параметром название папки files: 
app.use(filePathMiddleware(path.resolve(__dirname, 'files')))

app.use(fileUpload({}))
app.use(corsMiddleware) //функционал для обхода cors

app.use(express.json()) //т.к. по умолчанию Express не может распарсить json строку и это необходимо указать явно, что мы и делаем 

//теперь для самого сервера необходимо указать путь к статической папке для этого у express вызываем ф-ию static и в нее передаем
//путь к нашей папке и поскольку index.js лежит в корневой то можем просто написать static. Кстати, когда там появятся файлы то
//мы можем к ним обратиться набрав в строке название сервера и через слеш сам файл т.е. например: localhost:5000/c25f714c-e3f8-4ef6-b636-641ef8716098.jpg
// app.use(express.static("static"))
app.use(express.static(path.resolve(req.filePath, "static")))


app.get("/", function(req,res){ //просто сделал главную страницу
    console.log("Hey hey hey")
    res.send("<h1>Главная страница</h1>")

})

app.use("/api/auth", authRouter) //тут первым параметром указываем url по которому authRouter будет обрабатываться, а вторым передаем непосредственно сам authRouter
app.use("/api/files", fileRouter) 

const start=async()=>{ //данная функция будет подключаться к БД и запускать сервер. Поскольку подключение к БД это асинхронный процесс ведь подключение происходит не мгновенно и чтобы не блокировался процесс подключение асинхронно и посему делаем нашу ф-ию  также асинхронной
    try{
        await mongoose.connect(config.get("dbUrl"))  //первым параметром ф-ия connect принимает url к БД
        app.listen(PORT, ()=>{ //второй параметр - это ф-ия которая вызывается после того как сервер запустился
            console.log('Server started on port ', PORT)
        })
    }catch(e){

    }
}

start(); //вызываем нашу ф-ию