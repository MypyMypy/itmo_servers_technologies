import express from "express";
import bodyParser from "body-parser";
import { createReadStream } from "fs";
import crypto from "crypto";
import http from "http";

import multer from "multer";
import fetch from "node-fetch";
const { MongoClient } = (await import("mongodb")).default;
import { PNG } from "pngjs";
import puppeteer from "puppeteer";
import pug from "pug";

import appSrc from "./app.js";

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const LOGIN = "mypymypy";
const uuid = "8155ee0b-ebea-4a53-93fe-a9ae47fb83ee";

const app = appSrc(express, bodyParser, createReadStream, crypto, http);
const upload = multer();

const fetchPageHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Fetch task</title>
</head>
<body>
  <input id="inp" type="text">
  <button id="bt">Go</button>

  <script>
    (function () {
      const inp = document.getElementById('inp');
      const bt = document.getElementById('bt');

      bt.addEventListener('click', function () {
        const url = inp.value;
        fetch(url)
          .then(function (response) {
            return response.text();
          })
          .then(function (text) {
            inp.value = text;
          })
          .catch(function (err) {
            inp.value = 'Error: ' + err;
          });
      });
    })();
  </script>
</body>
</html>`;

const sampleFnCode = `function task(x) {
  return x * this * this;
}`;

app.get("/sample/", (_req, res) => {
  res.send(sampleFnCode);
});

const promiseFnCode = `function task(x){
  return new Promise(function(resolve, reject){
    if (x < 18){
      resolve('yes');
    } else {
      reject('no');
    }
  });
}`;

app.get("/promise/", (_req, res) => {
  res.type("text/plain; charset=UTF-8").send(promiseFnCode);
});

app.get("/fetch/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=UTF-8");
  res.send(fetchPageHtml);
});

app.all("/result4/", express.text({ type: "*/*" }), (req, res) => {
  const xTest = req.get("x-test") || "";
  const bodyValue = typeof req.body === "string" ? req.body : "";

  const payload = {
    message: uuid,
    "x-result": xTest,
    "x-body": bodyValue,
  };

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
});

app.get("/hour/", (_req, res) => {
  try {
    const dtf = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    const hour = hourPart
      ? hourPart.value
      : new Date()
          .toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
          .split(",")[1]
          .trim()
          .split(":")[0];
    res.type("text/plain").send(hour.padStart(2, "0"));
  } catch (e) {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const mosk = new Date(utc + 3 * 3600000);
    res.type("text/plain").send(String(mosk.getHours()).padStart(2, "0"));
  }
});

app.post(
  "/decypher/",
  upload.fields([{ name: "key" }, { name: "secret" }]),
  (req, res) => {
    try {
      const keyFile = req.files["key"] && req.files["key"][0];
      const secretFile = req.files["secret"] && req.files["secret"][0];
      if (!keyFile || !secretFile) return res.status(400).send("missing files");
      const keyPem = keyFile.buffer.toString("utf8");
      const secretBuf = secretFile.buffer;

      let decrypted;
      try {
        decrypted = crypto.privateDecrypt(
          { key: keyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
          secretBuf
        );
      } catch (e) {
        decrypted = crypto.privateDecrypt(
          { key: keyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
          secretBuf
        );
      }
      res.type("text/plain").send(decrypted.toString("utf8"));
    } catch (err) {
      res.status(500).send("decryption failed");
    }
  }
);

app.get("/id/:n/", async (req, res) => {
  const n = req.params.n;
  const url = `https://nd.kodaktor.ru/users/${encodeURIComponent(n)}`;
  try {
    const r = await fetch(url, { method: "GET", headers: {} });
    const json = await r.json();
    if (json && json.login) {
      return res.type("text/plain").send(String(json.login));
    }
    return res.status(502).send("no login");
  } catch (e) {
    res.status(500).send("proxy error");
  }
});

app.post("/size2json/", upload.single("image"), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send("missing image");

    const buf = file.buffer;
    if (buf.length < 24) return res.status(400).send("not a png");

    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    res.type("application/json").send(JSON.stringify({ width, height }));
  } catch (e) {
    res.status(500).send("parse error");
  }
});

app.get("/makeimage/", (req, res) => {
  const w = Math.max(
    1,
    Math.min(2000, parseInt(req.query.width || "1", 10) || 1)
  );
  const h = Math.max(
    1,
    Math.min(2000, parseInt(req.query.height || "1", 10) || 1)
  );
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (w * y + x) << 2;
      png.data[idx] = (x + y) % 256; // R
      png.data[idx + 1] = (x * 2) % 256; // G
      png.data[idx + 2] = (y * 2) % 256; // B
      png.data[idx + 3] = 255; // A
    }
  }
  res.setHeader("Content-Type", "image/png");
  png.pack().pipe(res);
});

const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.post("/insert/", urlencodedParser, async (req, res) => {
  let client;
  try {
    const { login, password, URL } = req.body;

    if (!URL) {
      return res.status(400).send("URL is required");
    }

    client = new MongoClient(URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();

    const dbName = URL.split("/").pop().split("?")[0];
    const db = client.db(dbName);

    const usersCollection = db.collection("users");

    const userDocument = {
      login: login,
      password: password,
    };

    await usersCollection.insertOne(userDocument);

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.get("/wordpress/wp-json/wp/v2/posts/1", (_req, res) => {
  res.json({
    id: 1,
    slug: uuid,
    title: {
      rendered: uuid,
    },
    content: {
      rendered: "",
      protected: false,
    },
  });
});

app.post("/render/", async (req, res) => {
  const { random2, random3 } = req.body;
  const { addr } = req.query;

  const templateResponse = await fetch(addr);
  const pugTemplate = await templateResponse.text();

  const compiled = pug.compile(pugTemplate);
  const html = compiled({ random2, random3 });

  res.set("Content-Type", "text/html; charset=UTF-8");
  res.send(html);
});

const CHROME_PATH =
  "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

app.get("/test/", async (req, res) => {
  const target = req.query.URL;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.goto(target, { waitUntil: "networkidle0" });

  await page.waitForSelector("#bt");
  await page.click("#bt");

  await page.waitForFunction(() => {
    const inp = document.querySelector("#inp");
    return inp && typeof inp.value === "string" && inp.value.length > 0;
  });

  const value = await page.$eval("#inp", (el) => el.value);

  await browser.close();

  res.type("text/plain").send(String(value));
});

app.all("*", (_req, res) => {
  res.type("text/plain").send(uuid);
});

app.listen(PORT, HOST, () => {
  console.log(`HTTP server running at http://${HOST}:${PORT}`);
});
