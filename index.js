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
		},
		dir: {
			alias: "d",
			describe: "working directory for the server - defaults to current dir",
			default: __dirname
		}
	}, function(argv) {
		scarlet.info("Jarfile: " + argv.jar);

		controller.spawn(function(s) {
			s.send(["pufferfish", "command", "spawn"], { name: argv.name, jarfile: argv.jar, min: argv["min-mem"], max: argv["max-mem"], cwd: argv.dir });

			scarlet.info("Starting Minecraft server '" + argv.name + "'...");

			s.end();

			//process.exit(0);
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

			s.end();
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
					vi: false,
					scrollbar: true,
					style: {
						scrollbar: {
							bg: "black",
							fg: "white"
						}
					}
				});

				var input = blessed.textbox({
					parent: screen,
					bottom: 0,
					left: 0,
					height: "5%",
					width: "50%",
					border: "line",
					fg: "white",
					inputOnFocus: true
				});

				input.on("submit", function() {
					s.send(["pufferfish", "command", "servercmd"], { name: argv.name, cmd: input.value });
					input.clearValue();

					screen.render();

					input.focus();
				});

				fs.readFile(__dirname + "/logs/" + argv.name + ".txt", "utf8", function(err, data) {
					logger.add(data.trim());

					screen.render();
				});

				var wsocket = new ws("ws://127.0.0.1:1350");

				wsocket.on("message", function(data, flags) {
					logger.add(data.trim());
					screen.render();
				});

				input.key("C-b", function() {
					s.end();
					screen.destroy();
					wsocket.close();
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