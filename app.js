const express = require("express");
const cors = require("cors")
const path = require("path")
const dotenv = require("dotenv");
const db = require("./database/connection");
const Admin = require("./models/Admin");
const Chat = require("./models/chatModel");
const Message = require("./models/messageModel");
const multer = require("multer");
const Product = require("./models/Product");
console.log(db);
const app = express();
// body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
dotenv.config();
app.use(cors());
app.use("/public", express.static(path.join(__dirname, "./public")))
console.log(__dirname)
db.connect();
const port = process.env.PORT;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images")
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + Math.random() + file.originalname)
  }
})

const upload = multer({ storage })
app.get("/", (req, res) => {
  res.send("hello")
})

app.post("/admin/register", async (req, res) => {
  console.log("register api called")
  try {
    const { username, password } = req.body;
    if (!username) throw new Error("Username cannot be empty");
    if (!password) throw new Error("password cannot be empty");
    const check = await Admin.findOne({ username });
    if (check) throw new Error("username already exist! Please try with another one.");
    const admin = new Admin(req.body);
    const adminObj = await admin.save();
    const response = {
      status: 1,
      message: "Registration Successful",
      admin: adminObj,
    };
    res.json(response);
  } catch (err) {
    console.log(err)
    res.send({
      status: 0,
      message: err.message,
    });
  }
})

app.post("/admin/login", async (req, res) => {
  console.log("login api runs")
  try {
    const { username, password } = req.body;
    if (!username) throw new Error("Username cannot be empty");
    if (!password) throw new Error("password cannot be empty");
    const user = await Admin.findOne({ username });
    if (!user) throw new Error("Incorrect username");
    const passwordMatches = await Admin.findOne({ password });
    if (!passwordMatches) throw new Error("Incorrect password");
    const response = {
      status: 1,
      message: "Login Successful",
      user,
    };
    res.json(response);
  } catch (err) {
    console.log(err)
    res.send({
      status: 0,
      message: err.message,
    });
  }
})

app.post("/products/add", upload.any(), async (req, res) => {
  const { productType, brandName, aboutProductShort, mrp } = req.body;
  try {
    const user = new Product({
      productType,
      brandName,
      aboutProductShort,
      mrp,
      img: req.files.map((f) => f.filename)
    })
    const data = await user.save();
    const response = {
      status: 1,
      message: "Product added Successfully",
      data,
    };
    res.json(response);
  }
  catch (err) {
    console.log(err)
    res.send({
      status: 0,
      message: err.message,
    });
  }
})

app.get("/products/get/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const products = await Product.find({ productType: id })
    const response = {
      status: 1,
      message: "Product fetched Successfully",
      products,
    };
    res.json(response);
  } catch (err) {
    console.log(err)
  }
})

app.get("/products/get/category/all", async (req, res) => {
  try {
    const products = await Product.find();
    const response = {
      status: 1,
      message: "Product added Successfully",
      products,
    };
    res.json(response);
  } catch (err) {
    console.log(err)
  }
})

// chats route

//access chat or create chat
app.post("/api/chat", async (req, res) => {
  const { userId, adminId } = req.body;
  if (!userId || !adminId) {
    console.log("params not sent with request");
    return res.sendStatus(400);
  }
  var isChat = await Chat.find({
    $and: [
      { users: { $elemMatch: { $eq: userId } } },
      { users: { $elemMatch: { $eq: adminId } } },
    ]
  }).populate("users", "-password").populate("latestMessage");
  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      users: [adminId, userId]
    };
    try {
      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate("users", "-password");
      res.status(200).send(fullChat)
    } catch (err) {
      res.status(400);
      throw new Error(err.message);
    }
  }
})


//fetch all chats of a particular user
app.get("/api/chat/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    Chat.find({ users: { $elemMatch: { $eq: userId } } })
      .populate("users", "-password")
      .populate("latestMessage", "-password")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        res.status(200).send(results);
      })
  } catch (err) {
    res.status(400);
    throw new Error(err.message)
  }
})


//message route

//send message

//userId is the one who is sending messages.
// chatId is the one who is associated with the particular chat.
app.post("/api/message", async (req, res) => {
  const { content, chatId, userId } = req.body;
  if (!content || !chatId) {
    console.log("Invalid data passed");
    return res.sendStatus(400);
  }
  var newMessage = {
    sender: userId,
    content,
    chat: chatId
  }

  try {
    var message = await Message.create(newMessage);
    message = await message.populate("sender", "username");
    message = await message.populate("chat");
    message = await Admin.populate(message, {
      path: "chat.users",
      select: "username"
    });
    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message
    })
    res.json(message)
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
})

//fetch messages
app.get("/api/message/:chatId", async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username")
      .populate("chat");
    res.json(messages)
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
})

const server = app.listen(port, () => {
  console.log(`app is listening to ${port}`);
})

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: ["https://cheery-smakager-182a9e.netlify.app",
      "https://grand-sopapillas-4a52f2.netlify.app/chats"]
    // origin: ["http://localhost:5173", "http://localhost:5174"
    // ]
  }
})

io.on("connection", (socket) => {
  console.log("connected to socket.io")

  socket.on("setup", (userData) => {
    socket.join(userData);
    socket.emit("connected");
  })

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("user joined room" + room)

  })
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));


  socket.on("new message", (newMessageReceived) => {
    socket.broadcast.emit("message received", newMessageReceived);
  })

  socket.on("new chat created", (newChatReceived) => {
    console.log(newChatReceived)
    socket.broadcast.emit("new chat received", newChatReceived);
  })
  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
})