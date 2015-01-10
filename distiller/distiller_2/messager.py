# -*- coding: utf-8 -*-
__author__ = 'Evin Özer'
#+ Messager
# Evin Özer
#
# 12/1/2014
#
#~
# Allows a Python component to communicate using ZMQ Push/Pull.
#-

import time
import zmq

class Messager:
    def __init__(self, protocol='tcp', host='0.0.0.0', push_port='5557', pull_port='5558'):
        context = zmq.Context()

        #+ ZMQ PUSH
        push_config = protocol+'://'+host+':'+push_port
        print 'Creating ZMQ PUSH:', push_config

        self.zmq_push_socket = context.socket(zmq.PUSH)
        self.zmq_push_socket.bind(push_config)
        #- ZMQ PUSH

        #+ ZMQ PULL
        pull_config = protocol+'://'+host+':'+pull_port
        print 'Creating ZMQ PULL:', pull_config

        self.zmq_pull_socket = context.socket(zmq.PULL)
        self.zmq_pull_socket.connect(pull_config)
        #- ZMQ PULL
        
    def send_message(self, message={}):
        print 'Sending message:', message
        self.zmq_push_socket.send_json(message)

    def receive_message(self, callback=None):
        message = self.zmq_pull_socket.recv_json()
        print 'Receiving message:', message

        if callback != None:
            callback(message)

if __name__ == '__main__':
    messager = Messager(push_port='5555', pull_port='5555')

    messager.send_message({'hello':'world'})
    messager.receive_message()
