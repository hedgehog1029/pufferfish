// worker.js - daemon that keeps track of all java processes

var nssocket = require("nssocket"),
	ws = require("ws"),
	cp = require("child_process");

var children = {}

var server = nssocket.createServer(function(socket) {
	socket.send(["pufferfish", "daemon"]);
	socket.data(["pufferfish", "controller"], function(data) {
		// Good: socket speaks the lingo
		// Now apply all other listeners

		socket.data(["pufferfish", "command", "spawn"], function(data) {
			var cprocess = cp.spawn("java", ["-Xms" + data.min, "-Xmx" + data.max, "-jar " + data.jarfile], {
				detatched: true
			});

			var wss = new ws.Server({ port: 1350 });
			wss.broadcast = function broadcast(data) {
				wss.clients.forEach(function each(client) {
					client.send(data);
				});
			};

			var f = fs.createWriteStream("./logs/" + data.name + ".txt", { flags: "a" });

			cprocess.stdout.on("data", function(data) {
				// HELP
				// ok lets just stream via a websocket
				// also log to file
				wss.broadcast(data);
				f.write(data + "\n");
			});

			children[data.name] = cprocess;
		});

		socket.data(["pufferfish", "command", "stop"], function(data) {
			if (children[data.name] != null)
				children[data.name].stdin.write("stop\n");
		});

		socket.data(["pufferfish", "command", "servercmd"], function(data) {
			if (children[data.name] != null)
				children[data.name].stdin.write(data.cmd + "\n");
		});

		socket.data(["pufferfish", "command", "logs"], function(data) {
			if (children[data.name] != null) {

			}
		});

		socket.data(["pufferfish", "command", "kill"], function(d) {
			process.exit(0);
		})
	});
});

server.listen(18035);