/*
Evin Ozer
11/19/2014
*/

/* This code can and should be generalized. */

//node stuff:
var server = require('http').createServer(handler);
var io_socket = require('socket.io')(server);
var fs = require('fs');
var zmq = require('zmq');
var child = require('child_process');
var sudo = require('sudo');

//+ socket.io
var io_socket_ip = '0.0.0.0',
    io_socket_port = '38175',
    io_socket_host = io_socket_ip+':'+io_socket_port;

var remote_message_from_UI = {};
server.listen(io_socket_port); console.log('taMe Server bound to: '+io_socket_host);
//- socket.io

//+ ZMQ
var remote_zmq_host = 'tcp://0.0.0.0:20000';
var remote_zmq_socket_push = zmq.socket('push');
remote_zmq_socket_push.bind(remote_zmq_host, bindable_to_remote);
console.log('Remote ZMQ push: ' + remote_zmq_host);
//- ZMQ

//+ socket.io Push/Pull:
io_socket.on('connection', function (socket) {
  socket.emit('connected', { message: 'UI Connected to taMe Controller' });
  
  socket.on('ui_toRemote', function (data) {
    remote_message_from_UI = data;
    remote_zmq_socket_push.send(remote_message_from_UI);
    console.log('To Remote', remote_message_from_UI);
  });
});
//- socket.io Push/Pull:

//+ Callback for attempted bind to remote host.
function bindable_to_remote(err){
  if (err){ 
    console.log(err.message); 
    process.exit(0); 
  }
  console.log('Bindable to remote host.')
}
//- Callback for attempted bind to remote host.

//+ HTTP response/reply server.
function handler (req, res) {
  fs.readFile(__dirname + '/app/index.html',
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

var pcap = require('pcap'),
    tcp_tracker = new pcap.TCP_tracker(),
    pcap_session = pcap.createSession('wlan0', "");

tcp_tracker.on('start', function (session) {
    var message = "Start of TCP session between " + session.src_name + " and " + session.dst_name;
    // console.log(message);
    // console.log(session);
    io_socket.emit('start_session', session);
});

tcp_tracker.on('end_session', function (session) {
    var message = "End of TCP session between " + session.src_name + " and " + session.dst_name;
    // console.log(message);
    // console.log(session);
    io_socket.emit('end_session', session);
});

pcap_session.on('packet', function (raw_packet) {
    var packet = pcap.decode.packet(raw_packet);
    tcp_tracker.track_packet(packet);
    // console.log(packet);
    io_socket.emit('on_packet', packet);
});