__author__ = 'Kevin Hernandez'
import re

class Rosetta:

	def __init__(self):
		self.connection_counter = 0

	def decode_hex(self, astring):
		symb_dict = {'!':'21','"':'22','#':'23','\$':'24',
			'%':'25','&':'26','\'':'27','(':'28',')':'29',
			'*':'2A','+':'2B',',':'2C','-':'2D','.':'2E',
			'/':'2F','0':'30','1':'31','2':'32','3':'33',
			'4':'34','5':'35','6':'36','7':'37','8':'38',
			'9':'39','\:':'3A',';':'3B','<':'3C','=':'3D',
			'>':'3E','?':'3F','@':'40','A':'41','B':'42',
			'C':'43','D':'44','E':'45','F':'46','G':'47',
			'H':'48','I':'49','J':'4A','K':'4B','L':'4C',
			'M':'4D','N':'4E','O':'4F','P':'50','Q':'51',
			'R':'52','S':'53','T':'54','U':'55','V':'56',
			'W':'57','X':'58','Y':'59','Z':'5A','[':'5B',
			'\\':'5C',']':'5D','^':'5E','_':'5F','`':'60',
			'a':'61','b':'62','c':'63','d':'64','e':'65',
			'f':'66','g':'67','h':'68','i':'69','j':'6A',
			'k':'6B','l':'6C','m':'6D','n':'6E','o':'6F',
			'p':'70','q':'71','r':'72','s':'73','t':'74',
			'u':'75','v':'76','w':'77','x':'78','y':'79',
			'z':'7A','{':'7B','|':'7C','}':'7D','~':'7E'}
		try:
			return symb_dict[astring]
		except:
			return None

	def test(self, astring):
		plain_text = {'Accept':True,'Referer':True,'Accept-Language':True,
			'Accept-Encoding':True,'User-Agent':True,'Host':True,'Connection':True,
			'Cookie':True,'Content-Type':True,'Content-Length':True,'X-Cache':True,
			'X-Cache-Lookup':True,'Via':True,'Connection':True,'Server':True}
		try:
			return plain_text[astring]
		except:
			return None

	def _format_lines(self, alist):
		_temp = str(alist)
		_remove_new_layer_notation = re.sub('b\'', '', _temp)
		_remove_end_layer_notation = re.sub('a\'', '', _remove_new_layer_notation)
		formatted = _remove_end_layer_notation
		return formatted

	def _accept_or_cookie(self, arow):
		temp = arow[0:6]
		try:
			if self.test(temp) is True:
				if temp == 'Accept':
					return arow
				elif temp == 'Cookie':
					return arow
				elif temp == 'Server':
					return arow
		except:
			pass
			
	def _referer_or_x_cache(self, arow):
		temp = arow[0:7]
		try:
			if self.test(temp) is True:
				if temp == 'Referer':
					return arow
				elif temp == 'X-Cache':
					return arow
		except:
			pass
			
	def _accept_lan_or_encoding(self, arow):
		temp = arow[0:15]
		try:
			if self.test(temp) is True:
				if temp == 'Accept-Language':
					return arow
				elif temp == 'Accept-Encoding':
					return arow
		except:
			pass
			
	def _user_agent_or_connection(self, arow):
		temp = arow[0:10]
		try:
			if self.test(temp) is True:
				if temp == 'User-Agent':
					return arow
				elif temp == 'Connection':
					self.connection_counter += 1
					if self.connection_counter < 2:
						return arow
					else:
						self.connection_counter = 0
						return str(arow) + '\n----------------------'
		except:
			pass
			
	def _content_len_or_x_cache_lookup(self, arow):
		temp = arow[0:14]
		try:
			if self.test(temp) is True:
				if temp == 'Content-Length':
					return arow
				elif temp == 'X-Cache-Lookup':
					return arow
		except:
			pass
			
	def _host(self, arow):
		temp = arow[0:4]
		try:
			if self.test(temp) is True:
				if temp == 'Host':
					return arow
		except:
			pass
				
	def _content_type(self, arow):
		temp = arow[0:12]
		try:
			if self.test(temp) is True:
				if temp == 'Content-Type':
					return arow
		except:
			pass
			
	def _via(self, arow):
		temp = arow[0:3]
		if self.test(temp) is True:
			if temp == 'Via':
				return arow
	
	def sifter(self, astring):
		a = self._format_lines(str(astring))
		b = re.sub('\\\\n\'', '', a)
		c = re.sub('\\\\r', '', b)
		# if only switches!!
		temp = []
		temp.append(self._accept_or_cookie(c))
		temp.append(self._referer_or_x_cache(c))
		temp.append(self._accept_lan_or_encoding(c))
		temp.append(self._user_agent_or_connection(c))
		temp.append(self._content_len_or_x_cache_lookup(c))
		temp.append(self._host(c))
		temp.append(self._content_type(c))
		temp.append(self._via(c))
		for i in range(len(temp)):
			if temp[i] is not None:
				return temp[i]

if __name__ == '__main__':
	x = Rosetta()
	#a = x.pull('Accept')
	#print(a)
	#b = x.pull('@')
	#print(b)
	c = x.sifter("Via: 1.0 www-proxy.sec558.com:3128 (squid/2.6.STABLE18)\r\n'")
	print(c)
