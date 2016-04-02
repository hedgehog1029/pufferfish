// server daemon connector

var daemon = require("daemon"),
	scarlet = require("scarlet").get("pufferfish", false),
	nssocket = require("nssocket");

var controller = {
	"spawn": function(cb) {
		var socket = new nssocket.NsSocket();

		var timeout = setTimeout(function() {
			socket.end();

			var child = daemon.daemon("./worker.js");

			scarlet.info("Pufferfish daemon spawned");

			socket.connect(18035);
		}, 1000);

		socket.data(["pufferfish", "daemon"], function() {
			clearTimeout(timeout);
			socket.send(["pufferfish", "controller"]);

			scarlet.info("Connected to Pufferfish daemon");

			cb(socket);
		});

		socket.connect(18035);
	},
	"kill": function() {
		controller.spawn(function(s) {
			s.send(["pufferfish", "command", "kill"]);
			s.end();

			scarlet.info("Pufferfish daemon shutting down.")
		})
	}
}