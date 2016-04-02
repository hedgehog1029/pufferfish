var yargs = require("yargs"),
	blessed = require("blessed"),
	fs = require("fs"),
	ws = require("ws"),
	scarlet = require("@hedgehog1029/scarlet").get("pufferfish", false),
	controller = require("./lib/controller.js");

yargs
	.usage("Usage: pufferfish <cmd> [args]")
	.command("run", "Start a Minecraft instance.", {
		jar: {
			alias: "j",
			describe: "the jarfile of the server to start.",
			demand: true
		},
		name: {
			alias: "n",
			describe: "the name of the instance to spawn",
			demand: true
		},
		"min-mem": {
			describe: "minimum memory allocation",
			default: "1024M"
		},
		"max-mem": {
			describe: "maximum memory allocation",
			default: "2G"
		}
	}, function(argv) {
		scarlet.info("Jarfile: " + argv.jar);

		controller.spawn(function(s) {
			s.send(["pufferfish", "command", "spawn"], { name: argv.name, jarfile: argv.jar, min: argv["min-mem"], max: argv["max-mem"] });

			scarlet.info("Starting Minecraft server '" + argv.name + "'...");
		});
	})
	.command("stop", "Stop a Minecraft instance.", {
		name: {
			alias: "n",
			describe: "the name of the instance to stop.",
			demand: true
		}
	}, function(argv) {
		controller.spawn(function(s) {
			s.send(["pufferfish", "command", "stop"], { name: argv.name });

			scarlet.info("Stopped server '" + argv.name + "'.");
		});
	})
	.command("attatch", "Attatch to a Minecraft instance.", {
		name: {
			alias: "n",
			describe: "the name of the instance to get logs for.",
			demand: true
		}
	}, function(argv) {
		controller.spawn(function(s) {
			s.send(["pufferfish", "command", "logs"], { name: argv.name });

			s.data(["pufferfish", "response", "logs"], function(data) {
				var screen = blessed.screen({
					smartCSR: true
				});

				screen.title = "Pufferfish - " + argv.name;

				var logger = blessed.log({
					parent: screen,
					top: 0,
					left: 0,
					width: "50%",
					height: "95%",
					border: "line",
					mouse: true,
					keys: true,
					vi: false
				});

				var input = blessed.textbox({
					parent: screen,
					bottom: 0,
					left: 0,
					height: "5%",
					width: "50%"
				});

				input.on("click", function() {
					input.readInput(function(data) {
						s.send(["pufferfish", "command", "servercmd"], { name: argv.name, cmd: data });
						input.clearValue();

						screen.render();
					});
				});

				input.key("enter", function() {
					input.submit();

					screen.render();
				});

				fs.readFile("./logs/" + argv.name + ".txt", function(data) {
					logger.add(data);

					screen.render();
				});

				var ws = new ws("ws://127.0.0.1:1350");

				ws.on("message", function(data, flags) {
					logger.add(data);
					screen.render();
				});

				screen.key("C-c", function() {
					return screen.destroy();
				});

				input.focus();
				screen.render();
			});
		});
	})
	.command("kill", "Kill the Pufferfish daemon.", {}, function(argv) {
		controller.kill();
	})
	.help()
	.argv;