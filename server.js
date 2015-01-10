/*
Evin Ozer
11/19/2014
*/

/* This code can and should be generalized. */
(function() {
	var Router = function() {
		//+ Libs
		var zmq = require('zmq');
		var sudo = require('sudo');
		var findit = require('findit');
		var path = require('path');
		var util = require('util');
		var pcapp = require('pcap-parser');

		var path = require('path');
		var fs = require('fs');
		//- Libs

		var self = this;
		self.upload_files = {};
		self.metadata_ext = ".sp";

		self.initialize = function() {

			self.upload_dir = './app/uploads';

			//+ socket.io
			self.server = require('http').createServer(self.__handler); console.log('SneakPeek HTTP Server bound to: localhost:3817');
			self.io_socket = require('socket.io')(self.server);
			var io_socket_ip = '0.0.0.0',
				io_socket_port = '38176';
			self.io_socket_host = io_socket_ip+':'+io_socket_port;

			self.server.listen(io_socket_port); console.log('SneakPeek RPC Server bound to: '+self.io_socket_host);
			//- socket.io
			
			////+ socket.io Push/Pull:
			self.io_socket.on('connection', function (socket) {
				var connect_message = {
					info: 'UI Connected to SneakPeek Controller',
					is_live_capture: self.spw !== undefined
				};
				socket.emit('connected', connect_message);
			  	
			  	self.scan_upload_directory();
				
				// source: "SneakPeek",
		  //       destination: "Distiller",
		  //       payload: {
		  //           command: "parse_file_pcap",
				socket.on('ui_toRemote', function (message) {
					console.log(message);
					
					// console.log('To Remote', message);
					self.remote_zmq_socket_push.send(message);
					// self._parse_local(JSON.parse(remote_message_from_UI));
				});

				socket.on('list_files', function (message) {
					var finder = findit(self.upload_dir);
				 	finder.on('file', self.__finder_on_file);
					finder.on('end', self.__finder_on_end);
				});

				socket.on('toggle_live_capture', function (message) {
					message = JSON.parse(message);
					var checked = message['payload'].checked;
					if ((checked) && (self.spw !== undefined)) {
						self.spw.kill('SIGINT');
						self.spw = undefined;
					}

					if (checked) {
						self.start_packet_capture({
							command: 'tshark',
							args: [
								'-i', 'wlan0',
								'-l',
								// '-a', 'duration:10',
								'-T', 'pdml',
								'-w', self.upload_dir+'/'+message['payload']['filename']+'.pcapng']
						});
					} else {
						if (self.spw !== undefined) {
							self.spw.kill('SIGINT');
							self.spw = undefined;
						}
					}

					self.scan_upload_directory();
				});
			});
			//- socket.io Push/Pull:

			//+ ZMQ
			//#     zmq_push/pull: https://github.com/JustinTulloss/zeromq.node/blob/master/examples/push_pull.js
			self.remote_zmq_push_host = 'tcp://0.0.0.0:5555';
			self.remote_zmq_socket_push = zmq.socket('push');
			self.remote_zmq_socket_push.identity = 'from_ui';
			self.remote_zmq_socket_push.bind(self.remote_zmq_push_host, self.__bindable_to_remote);
			console.log('ZMQ Push bound to: ' + self.remote_zmq_push_host);

			self.remote_zmq_pull_host = 'tcp://0.0.0.0:5556';
			self.remote_zmq_socket_pull = zmq.socket('pull');
			self.remote_zmq_socket_pull.identity = 'to_ui';
			self.remote_zmq_socket_pull.connect(self.remote_zmq_pull_host);
			console.log('ZMQ Pull bound to: ' + self.remote_zmq_pull_host);

			self.remote_zmq_socket_pull.on('message', function(message) {
				// console.log(self.remote_zmq_socket_pull.identity + ': received data ' + message.toString());
				// self.upload_files[message['payload']['filename']]
				message = JSON.parse(message);
				if (message['payload']['command'] === 'show') {
					self.io_socket.emit('on_pcap_file_packet', message);
				} else if (message['payload']['command'] === 'request_metadata_update') {
					self.io_socket.emit('request_metadata_update', message);
				} else if (message['payload']['command'] === 'display_metadata') {
					self.io_socket.emit('display_metadata', message);
				}
			});
			//- ZMQ

			console.log("HI!");
		}

		self.scan_upload_directory = function() {
			var finder = findit(self.upload_dir);
		  	finder.on('file', self.__finder_on_file);
			finder.on('end', self.__finder_on_end);
		}

		//+ Callback for attempted bind to remote host.
		self.__bindable_to_remote = function(err) {
			if (err){ 
				console.log(err.message); 
				process.exit(0); 
			}

			console.log('Bindable to remote host.')
		}
		//- Callback for attempted bind to remote host.

		//+ HTTP response/reply server.
		self.__handler = function(req, res) {
			fs.readFile(
				__dirname + '/app/index.html',
				function (err, data) {
					if (err) {
						res.writeHead(500);
						return res.end('Error loading index.html');
					}
					
					res.writeHead(200);
					res.end(data);
			});
		};
		//- HTTP response/reply server.

		self.__finder_on_file = function(file, stat) {
		    // console.log(file);
		    // console.log(stat);
		    if (path.extname(path.basename(file)) !== ".sp") {
		    	self.upload_files[path.basename(file)] = {
					name: path.basename(file),
			    	ctime: stat['atime'],
			    	num_hosts: 0    	
			    };
		    }
		};

		self.__finder_on_end = function() {
			self.io_socket.emit('list_files', self.upload_files);
			self.upload_files = {};			
		}

		self._parse_local = function(message) {


			var parser = pcapp.parse('./app/uploads/'+message.payload['filename']);
			// var parser = pcapp.parse(process.stdin);

			parser.on('packet', function(packet) {
			  console.log(packet.header);
			  console.log(packet.data);
			});

			return;

			// console.log(message);
			var cmd = 'tshark -r ./app/uploads/'+message.payload['filename']+' -l -T pdml';
			self.run_command({
				callback: function (data) {
					var str = data.toString();
					// console.log(str);
					
					//example read from chunks
					parser.parseString(str);
					// var xmlDoc = libxmljs.parseXml(str);

					// xpath queries
					// var packets = xmlDoc.get('packet');
					// console.log(packets);

					return;
					self.parse_xml_string(str, function (err, result) {
						var message = self.parse_pdml(result, true);
						
						if (message !== undefined) {
							// console.log(message);
							self.io_socket.emit('on_pcap_file_packet', message);
						}
					});
				},
				command: cmd
			});
		};

		self.parse_pdml = function(xml, from_file) {
			console.log(xml);
			if ((xml === undefined) || (xml === null)) { return; }

			// if (xml['packet'] !== undefined) {
	            var now = new Date().toISOString();
				var message = {
					'timestamp': now,
					'source': 'Distiller',
					'destination': 'SneakPeek',
					'payload': {
						'shost': {},
						'dhost': {}
					}
				};

				if (from_file) {
					//+ Introspect
					// var proto = xml['packet'];
					// console.log(xml);
					for (var i = 0; i < xml.length; i++) {
						var field = xml[i];
						if (field[1] === 'ip.src') {
							console.log(xml);
						}
					}
					return;					
					console.log("GENERAL");
					console.log("0", proto[0]);
					console.log("0", proto[0]['$']['field']); 		
					console.log("FRAME");
					console.log("1", proto[1]);
					console.log("1", proto[1][0]['$']['show']); 		// Interface ID
					console.log("1", proto[1][1]['$']['show']); 		// Encapsulation Type
					console.log("1", proto[1][2]['$']['show']); 		// Time
					console.log("1", proto[1][5]['$']['show']); 		// Time Delta
					console.log("1", proto[1][7]['$']['show']); 		// Time Since First Frame
					console.log("1", proto[1][8]['$']['show']); 		// Frame Number
					console.log("1", proto[1][9]['$']['show']); 		// Frame Length (bytes)
					console.log("1", proto[1][10]['$']['show']); 		// Frame Capture Length (bytes)
					console.log("1", proto[1][11]['$']['show']); 		// Frame Marked?
					console.log("1", proto[1][12]['$']['show']); 		// Frame Ignored?
					console.log("1", proto[1][13]['$']['show']); 		// Encapsulated Protcols
					console.log("1", proto[1][13]['$']['show']); 		// Encapsulated Protcols
					console.log("LINK");
					console.log("2", proto[2]);
					console.log("2", proto[2]); 			
					console.log("2", proto[2][0]['$']['show']);			// Destination MAC
					console.log("2", proto[2][1]['$']['show']);			// Source MAC
					console.log("2", proto[2][2]['$']['show']);			// HEX Encapsulated Type
					console.log("2", proto[2][2]['$']['showname']);		// Source MAC

					console.log("2", proto[5]['show']); 		// Time Delta

					if (proto[2]['field'].length < 3) { return; }
					message['payload']['shost']['source_mac'] = proto[2]['field'][1]['$']['show'];
					message['payload']['dhost']['destination_mac'] = proto[2]['field'][0]['$']['show'];

					console.log("NETWORK");
					console.log("3", proto[3]);
					console.log("3", proto[3]['field']);

					if (proto[3]['field'].length < 16) { return; }
					message['payload']['shost']['source_ip'] = proto[3]['field'][11]['$']['show'];
					message['payload']['dhost']['destination_ip'] = proto[3]['field'][15]['$']['show'];

					console.log("TRANSPORT");
					console.log("4", proto[4]);
					if (proto[4]['field'] === undefined) { return message; }
					console.log("4", proto[4]['field']);

					if (proto[5] === undefined) { return message; }
					console.log("5", proto[5]);
					if (proto[5]['field'] === undefined) { return message; }
					console.log("5", proto[5]['field']);
					//- Introspect
				}

				else {
					//+ Introspect
					var proto = xml['packet'].proto;
					console.log(xml);
					console.log("GENERAL");
					console.log("0", proto[0]);
					console.log("0", proto[0]['field']); 		// Interface ID
					console.log("FRAME");
					console.log("1", proto[1]);
					console.log("1", proto[1]['field']); 		// Encapsulation Type
					console.log("LINK");
					console.log("2", proto[2]);
					console.log("2", proto[2]['field']); 		// Time

					if (proto[2]['field'].length < 3) { return; }
					message['payload']['shost']['source_mac'] = proto[2]['field'][1]['$']['show'];
					message['payload']['dhost']['destination_mac'] = proto[2]['field'][0]['$']['show'];

					console.log("NETWORK");
					console.log("3", proto[3]);
					console.log("3", proto[3]['field']);

					if (proto[3]['field'].length < 16) { return; }
					message['payload']['shost']['source_ip'] = proto[3]['field'][11]['$']['show'];
					message['payload']['dhost']['destination_ip'] = proto[3]['field'][15]['$']['show'];

					console.log("TRANSPORT");
					console.log("4", proto[4]);
					if (proto[4]['field'] === undefined) { return message; }
					console.log("4", proto[4]['field']);

					if (proto[5] === undefined) { return message; }
					console.log("5", proto[5]);
					if (proto[5]['field'] === undefined) { return message; }
					console.log("5", proto[5]['field']);
					//- Introspect
				}
				
				return message;

			// } else if (xml['field'] !== undefined) {
			// 	// console.log(xml);
			// }
		}

		self.start_packet_capture = function(options) {
			var fs = require('fs');
			var child = require('child_process');
			
			if (options['command'] === 'tshark') {
				self.spw = child.spawn(options['command'], options['args']),
					str = "";

				self.spw.stdout.on('data', function (data) {
					str = data.toString();

					self.parse_xml_string(str, function (err, result) {
						var message = self.parse_pdml(result);
						
						if (message !== undefined) {
							// console.log(message);
							self.io_socket.emit('on_pcap_file_packet', message);
						}
					});
				});

				self.spw.on('close', function (code) {
					// res.end(str);
					console.log("EXIT:", code);
				});

				self.spw.stderr.on('data', function (data) {
					// res.end('stderr: ' + data);
					// console.log("ERROR:", data);
				});
			} else if (options['command'] === 'node_pcap') {
				var pcap = require('pcap'),
				    tcp_tracker = new pcap.TCP_tracker(),
				    pcap_session = pcap.createSession('eth0', "");

				tcp_tracker.on('start', function (session) {
				    var message = "Start of TCP session between " + session.src_name + " and " + session.dst_name;
				    // console.log(message);
				    // console.log(session);
				    self.io_socket.emit('start_session', session);
				});

				tcp_tracker.on('end_session', function (session) {
				    var message = "End of TCP session between " + session.src_name + " and " + session.dst_name;
				    // console.log(message);
				    // console.log(session);
				    self.io_socket.emit('end_session', session);
				});

				pcap_session.on('packet', function (raw_packet) {
				    var packet = pcap.decode.packet(raw_packet);
				    tcp_tracker.track_packet(packet);
				    // console.log(packet);
				    self.io_socket.emit('on_packet', packet);
				});
			}
	  	};

	  	self.run_command = function(options) {
	  		var fs = require('fs');
			var child = require('child_process');
			var xml2js = require('xml2js');
			
			cmd = options['command'].split(' ');
			var command = cmd[0];
			var args = cmd.slice(1);
			var	spw = child.spawn(command, args),
				str = "";

			spw.stdout.on('data', options['callback']);

			spw.on('close', function (code) {
				// res.end(str);
			});

			spw.stderr.on('data', function (data) {
				// res.end('stderr: ' + data);
			});
		}
	}

	var router = new Router();
	router.initialize();
	// router.start_packet_capture({
	// 	command: 'tshark',
	// 	args: [
	// 		'-i', 'wlan0',
	// 		'-l',
	// 		// '-a', 'duration:10',
	// 		'-T', 'pdml']
	// });

	// execute('tshark -i wlan0 -V -l -a duration:2 -T pdml',
	//         {maxBuffer: 1024 * 100000},
	//         function(error, stdout, stderr) {
	//           // console.log('stdout: ' + stdout);
	//           // console.log('stderr: ' + stderr);
	//           parseString(stdout, function (err, result) {
	//             console.log(result);
	//           });

	//           if (error !== null) {
	//               console.log('exec error: ' + error);
	//           }
	// });
})();