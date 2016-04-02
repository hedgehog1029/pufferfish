// worker.js - daemon that keeps track of all java processes

var nssocket = require("nssocket"),
	fs = require("fs"),
	ws = require("ws"),
	cp = require("child_process");

var children = {}

var server = nssocket.createServer(function(socket) {
	socket.send(["pufferfish", "daemon"]);
	socket.data(["pufferfish", "controller"], function(data) {
		// Good: socket speaks the lingo
		// Now apply all other listeners

		socket.data(["pufferfish", "command", "spawn"], function(data) {
			var cprocess = cp.spawn("java", ["-Xms" + data.min, "-Xmx" + data.max, "-jar", data.jarfile, "nogui"], {
				detatched: true,
				cwd: data.cwd
			});

			cprocess.on("error", function(err) {
				fs.appendFile("./wlog/workerlog.txt", err + "\r\n");
			});

			var wss = new ws.Server({ port: 1350 });
			wss.broadcast = function broadcast(data) {
				wss.clients.forEach(function each(client) {
					client.send(data);
				});
			};

			var f = fs.createWriteStream("./logs/" + data.name + ".txt");

			f.on("error", function(err) {
				fs.appendFile("./wlog/workerlog.txt", err + "\r\n");
			});

			cprocess.stdout.on("data", function(d) {
				// HELP
				// ok lets just stream via a websocket
				// also log to file
				wss.broadcast(d.toString('utf8'));
				f.write(d + "\n");

				fs.appendFile("./wlog/workerlog.txt", "[STDOUT|" + data.name + "] " + d);
			});

			cprocess.stderr.on("data", function(d) {
				fs.appendFile("./wlog/workerlog.txt", "[STDERR|" + data.name + "] " + d);
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
				socket.send(["pufferfish", "response", "logs"]);
			}
		});

		socket.data(["pufferfish", "command", "kill"], function(d) {
			process.exit(0);
		})
	});
});

server.listen(18035);