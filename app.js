const uuid = "8155ee0b-ebea-4a53-93fe-a9ae47fb83ee";
const LOGIN = "mypymypy";

export default function appSrc(
  express,
  bodyParser,
  createReadStream,
  crypto,
  http
) {
  const app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use((_req, res, next) => {
    res.setHeader("Content-Type", "text/plain; charset=UTF-8");
    res.setHeader("X-Author", uuid);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).send("OK");
  });

  app.get("/", (_req, res) => {
    res.send(uuid);
  });

  app.get("/login/", (_req, res) => {
    res.send(uuid);
  });

  app.get("/code/", (_req, res) => {
    const filePath = import.meta.url.substring(7); // file://...
    const stream = createReadStream(filePath, { encoding: "utf8" });

    res.setHeader("Content-Type", "text/plain; charset=UTF-8");

    stream.on("error", () => {
      res.status(500).send("read error");
    });

    stream.pipe(res);
  });

  app.get("/sha1/:input/", (req, res) => {
    const { input } = req.params;
    const hash = crypto.createHash("sha1").update(input).digest("hex");
    res.type("text/plain").send(hash);
  });

  app.all("/req/", (req, res) => {
    const addr =
      req.method === "GET" ? req.query.addr : req.body && req.body.addr;

    if (!addr) {
      return res.status(400).type("text/plain").send("no addr");
    }

    try {
      http
        .get(addr, (upstreamRes) => {
          let data = "";

          upstreamRes.on("data", (chunk) => {
            data += chunk.toString();
          });

          upstreamRes.on("end", () => {
            res.type("text/plain").send(data);
          });

          upstreamRes.on("error", () => {
            res.status(502).type("text/plain").send("upstream error");
          });
        })
        .on("error", () => {
          res.status(500).type("text/plain").send("request error");
        });
    } catch (e) {
      res.status(500).type("text/plain").send("internal error");
    }
  });

  return app;
}
