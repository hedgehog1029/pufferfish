// server daemon connector

var daemon = require("daemon"),
	scarlet = require("@hedgehog1029/scarlet").get("pufferfish", false),
	nssocket = require("nssocket");

var controller = {
	"spawn": function(cb) {
		var socket = new nssocket.NsSocket();

		socket.data(["pufferfish", "daemon"], function() {
			socket.send(["pufferfish", "controller"], function() {
				scarlet.info("Connected to Pufferfish daemon");

				cb(socket);
			});
		});

		socket.on("error", function(err) {
			var child = daemon.daemon("./lib/worker.js");

			child.unref();

			scarlet.info("Pufferfish daemon spawned");

			controller.spawn(cb); // this may cause an infiniloop - figure out a good way to fix this
		});

		socket.connect(18035);
	},
	"kill": function() {
		controller.spawn(function(s) {
			s.send(["pufferfish", "command", "kill"]);
			s.end();

			scarlet.info("Pufferfish daemon shutting down.");

			process.exit(0);
		})
	}
}

module.exports = controller;