__author__ = 'Kevin Hernandez'
# it-wingman@outlook.com
# Description: Reads and seperates pertinent pcap information.
# This script wil return string data containing Hostname, User-Agent,
# protocol, both Source/Destination IP/MAC addresses & ports.
# Last edited: 12/2/14
import sys
import os
import time
from datetime import datetime

import re
import binascii

from messager import Messager
from hex_builder import *
from hex_rosetta import *

class Distiller:

	def __init__(self, data_directory, pull_port='5555', push_port='5556'):
		self.data_directory = data_directory
		self.messager = Messager(pull_port=pull_port, push_port=push_port)

		self.build = Builder()
		self.stone = Rosetta()
		self.ipv4_marker = '[--> IPV4 <--]'
		self.ipv6_marker = '[--> IPV6 <--]'
		self.hm_len = len(self.ipv4_marker)
		self.seperator = '-------------------------------'

	def __on_receive_command(self, message):
		print message

		if message['payload']['command'] == 'parse_file_pcap':
			file_name = message['payload']['filename']
			file_path = os.path.join(self.data_directory, file_name)
			self.read_file(file_path)

	def receive_command(self):
		self.messager.receive_message(self.__on_receive_command)

	def read(self, _hex):
		'''
		This function reads and parses pcap hex strings.
		'''
		# get user-agent and host and date
		message = {};
		hex_string = _hex
		recovered_text = self.stone.sifter(hex_string)
		if recovered_text is not None:
			print(recovered_text)
			#send to json directly from sifter
		else:
			# converts string to true hex
			pcap_string = binascii.hexlify(hex_string)
			ipv4 = self._ipv4(pcap_string)
			ipv6 = self._ipv6(ipv4)
			filtered = ipv6
			message = self._parse_ipv4(filtered)
			self._parse_ipv6(filtered)

			return message;

	def read_file(self, afile):
		'''
		This function opens a pcap file and passes
		it through the read function line by
		line for parsing.
		'''
		_file = open(afile, 'rb')
		for row in list(_file):
			message = self.read(row);
			if message != None and type(message) == dict:
				message['payload']['filename'] = afile;
				self.messager.send_message(message);

	def _ipv4(self, astring):
		'''
		This function filters for ipv4 header tags.
		'''
		filter1 = re.sub('[1-9][a-f]000000[1-9][a-f]000000', self.ipv4_marker, astring)
		filter2 = re.sub('[a-f][a-f]0[1-9]0000[a-f][a-f]0[1-9]0000', self.ipv4_marker, filter1)
		return filter2

	def _parse_ipv4(self, astring):
		'''
		This function parses ipv4 strings.
		Specific slices for specific data.
		'''
		if self.ipv4_marker in astring:
			header_frame = astring.index(self.ipv4_marker) + self.hm_len
			try:
				dmac = str(astring[header_frame:header_frame+12])
				smac = str(astring[header_frame+12:header_frame+24])
				types = str(astring[header_frame+24:header_frame+28])
				prot = str(astring[header_frame+46:header_frame+48])
				sip = str(astring[header_frame+52:header_frame+60])
				dip = str(astring[header_frame+60:header_frame+68])
				sprt = str(astring[header_frame+68:header_frame+72])
				dprt = str(astring[header_frame+72:header_frame+76])
			except:
				pass
			
			try:
				type_ = str(self.build.define_type(types))
				protocol = str(self.build.define_prot(prot))
				dest_mac = str(self.build._mac(dmac))
				dest_ip = str(self.build._ip(dip))
				dest_port = str(self.build._port(dprt))
				src_mac = str(self.build._mac(smac))
				src_ip = str(self.build._ip(sip))
				src_port = str(self.build._port(sprt))

				# quality check
				qc = str(type_+'\n'+protocol+'\n'+src_mac+'\n'+src_ip+
					'\n'+src_port+'\n'+dest_mac+'\n'+dest_ip+'\n'+
					dest_port+'\n'+self.seperator)
				print(qc)

				#+ Send Message
				now = datetime.now().isoformat(' ')
				message = {
					'timestamp': now,
					'source': 'Distiller',
					'destination': 'SneakPeek',
					'payload': {
						'command': 'show',
						'header_type': type_,
						'protocol_type': protocol,
						'shost': {
							'source_mac': src_mac,
							'source_ip': src_ip,
							'source_port': src_port
						},
						'dhost': {
							'destination_mac': dest_mac,
							'destination_ip': dest_ip,
							'destination_port': dest_port
						}
					}
				}

				return message;
				#- Send Message
				
			except:
				pass
		else:
			pass
			

	def _ipv6(self, astring):
		'''
		This function filters for ipv6 header tags.
		'''
		filter3 = re.sub('0[1-9]00[1-9]0000000[1-9]0000000', self.ipv6_marker, astring)
		filter4 = re.sub('00[1-9][1-9]000000[1-9][1-9]000000', self.ipv6_marker, filter3)
		filter5 = re.sub('00[1-9][a-f]0[1-9]0000[1-9][a-f]0[1-9]0000', self.ipv6_marker, filter4)
		filter6 = re.sub('00[a-f][1-9]000000[a-f][1-9]000000', self.ipv6_marker, filter5)
		filter7 = re.sub('010000[a-f][1-9]010000', self.ipv6_marker, filter6)
		return filter7

	def _parse_ipv6(self, astring):
		'''
		This function parses ipv6 strings.
		Specific slices for specific data.
		'''
		if self.ipv6_marker in astring:
			header_frame = astring.index(self.ipv6_marker) + self.hm_len
			try:
				dmac = str(astring[header_frame:header_frame+12])
				smac = str(astring[header_frame+12:header_frame+24])
				types = str(astring[header_frame+24:header_frame+28])
				prot = str(astring[header_frame+40:header_frame+42])
				sip = str(astring[header_frame+44:header_frame+77])
				dip = str(astring[header_frame+76:header_frame+109])
				sprt = str(astring[header_frame+108:header_frame+112])
				dprt = str(astring[header_frame+112:header_frame+116])
			except:
				pass
			try:
				type_ = str(self.build.define_type(types))
				protocol = str(self.build.define_prot(prot))
				dest_mac = str(self.build._mac(dmac))
				dest_ip = str(self.build._ipv6_ip(dip))
				dest_port = str(self.build._port(dprt))
				src_mac = str(self.build._mac(smac))
				src_ip = str(self.build._ipv6_ip(sip))
				src_port = str(self.build._port(sprt))

				# quality check
				qc = str(type_+'\n'+protocol+'\n'+src_mac+'\n'+src_ip+
					'\n'+src_port+'\n'+dest_mac+'\n'+dest_ip+'\n'+
					dest_port+'\n'+self.seperator)
				print(qc)

				#+ Send Message
				now = datetime.now().isoformat(' ')
				message = {
					'timestamp': now,
					'source': 'Distiller',
					'destination': 'SneakPeek',
					'payload': {
						'command': 'show',
						'header_type': type_,
						'protocol_type': protocol,
						'shost': {
							'source_mac': src_mac,
							'source_ip': src_ip,
							'source_port': src_port
						},
						'dhost': {
							'destination_mac': dest_mac,
							'destination_ip': dest_ip,
							'destination_port': dest_port
						}
					}
				}

				# self.messager.send_message(message);
				#- Send Message
				return message;
				
			except:
				pass
		else:
			pass


if __name__ == '__main__':
	distiller = Distiller('../app/uploads')
	while True:
		distiller.receive_command()

	# x = Distiller()
	# a = 'evidence01.pcap'
	# b = 'evidence-malware.pcap'
	# c = 'evidence01-talkers.pcap'
	# d = 'AimMessageBlock.pcap'

	# x.read_file(a)
