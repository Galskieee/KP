const express = require('express');
const ytdl = require('ytdl-core');
const fs  = require("fs");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const  { connectDB, closeDB, DeleteDB ,client } = require("./db/database");
const { get } = require('http');
const app = express();
const PORT = 3000;

connectDB();


app.use(express.static("views"));
app.use(express.static("img"));
app.set("view engine", "ejs");


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


const storage = multer.diskStorage({
  destination: function (req, res, cb) {
    cb(null, 'img/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });


app.get("/home", async (req,res) => {

    res.render("index");
})





app.post('/', async (req, res) => {
 const {url} = req.body;
 console.log(url);


  try {
    const info = await ytdl.getInfo(url);
     const {videoDetails} = info;
     const title = videoDetails.title.replace(/[\s-]/g, '')
     const encodedTitle = encodeURIComponent(title);
     res.header('Content-Disposition', `attachment; filename="${encodedTitle}.mp4"`);
    //  res.setHeader('Content-Disposition', `attachment; filename="${encodedTitle}.mp4"`);
    ytdl(url, { format: "mp4", quality: "highestvideo", filter: "audioandvideo" }).pipe(res);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send(`Error ${error.message}`);
  }
});



app.get("/admin", async (req,res) => {
  const bd = await client.db("galangdb");
  const cd = await bd.collection("feedback");
  const db = await cd.find({}).toArray();
  res.render("admin", {db, length: db.length});
})

app.get("/feedback", async(req,res) => {
   res.render("feedback");
})

app.post("/feedback", upload.single('file'), async (req, res) => {
  const { name, email, message, time } = req.body;
  const file = req.file ? req.file.filename : null;

  const bd = await client.db("galangdb");
  const cd = await bd.collection("feedback");
  await cd.insertOne({ name, email, message, file , time});

  // res.json({ success: true, message: 'Data berhasil masuk' });
});

app.delete("/admin", async (req,res) => {
    const {namaFile, name} = req.body;

    const bd = await client.db("galangdb");
    const cd = await bd.collection("feedback");
    const hasilHapus = await cd.deleteOne({name});
    console.log(hasilHapus.deletedCount)
    fs.unlink(`img/${namaFile}` ,(err) => {
      if (err) {
        console.log("error menghapus gambar", err)
      } else {
        console.log("berhasil menghapus gambar");
      }
    })
    res.json({namaFile,name});
})


app.post("/history", async (req,res) => {
  const {url} = req.body; 

  const result = await Promise.all([
    client.db("galangdb").collection("history"),
    ytdl.getInfo(url),
  ])
   
  const [mongo,yt] = result;


  const videoDetails = {
    title: yt.videoDetails.title,
    description: yt.videoDetails.description,
    thumbnail: yt.videoDetails.thumbnails[4].url,
    time_video: yt.videoDetails.lengthSeconds,
  }

 
  await mongo.insertOne(videoDetails);
   
  res.send("kicau mania")
})


app.get("/history", async(req,res) => {

   const db = await client.db("galangdb");
   const gh = await db.collection("history");
   const arraygh = await gh.find({}).toArray();

  res.render("history", {res: arraygh});
})



process.on('SIGINT', async () => {
  await closeDB();
  process.exit();
});



  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });