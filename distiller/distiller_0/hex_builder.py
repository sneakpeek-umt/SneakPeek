__author__ = 'Kevin Hernandez'

class Builder:

	def __init__(self):
		pass

	def _convert(self, astring):
		_dec = int(astring, 16)
		return _dec

	def rebuild_port(self, astring):
		port = self._convert(astring)
		return port

	def rebuild_ip(self, astring):
		str_list = list(astring)
		ip_list = []
		ip_list.append(str_list[0] + str_list[1])
		ip_list.append(str_list[2] + str_list[3])
		ip_list.append(str_list[4] + str_list[5])
		ip_list.append(str_list[6] + str_list[7])

		ip = ''
		for i in range(4):
			ip += str(self._convert(ip_list[i]))
			if i < 3:
				ip += '.'
		return ip

	def rebuild_mac(self, astring):
		impossible_mac = 'ff:ff:ff:ff:ff:ff'

		str_list = list(astring)
		mac_list = []
		mac_list.append(str_list[0] + str_list[1])
		mac_list.append(str_list[2] + str_list[3])
		mac_list.append(str_list[4] + str_list[5])
		mac_list.append(str_list[6] + str_list[7])
		mac_list.append(str_list[8] + str_list[9])
		mac_list.append(str_list[10] + str_list[11])

		mac = ''
		for i in range(len(mac_list)):
			mac += str(mac_list[i])
			if i < 5:
				mac += ':'
		if mac == impossible_mac:
			return str(mac) + ' (\'EVERYONE\')'
		else:
			return mac

	def define_prot(self, aprotocol):
		prot = str(aprotocol)
		tcp = '06'
		udp = '11'

		if tcp == prot:			
			return 'TCP'
		elif udp == prot:
			return 'UDP'

if __name__ == '__main__':
	test = Builder()
	print(test.rebuild_port('c7b8'))
	print(test.rebuild_ip('c0a80102'))
	print(test.rebuild_mac('e0cb4efab9d9'))
	print(test.define_prot(11))