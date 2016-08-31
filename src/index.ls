
#	irc-support-bot-validate
#	------------------------
#	Code validation plug-in for irc-support-bot
#	This is an official plug-in
#
#	Provides one bot command: 'v'

'use strict'


util    = require 'util'
exec    = require 'child_process' .exec
shorten = require 'goo.gl'
js      = require 'js-extensions'
w3c-css = require 'w3c-css'

uri-regex = /https?:\/\/\S+/
markup-fragment-tpl = """<!DOCTYPE html><html><head><title>Test</title></head><body>{{fragment}}</body></html>"""
data-uri-tpl = """data:text/html;charset=utf-8,{{doc}}"""


module.exports = ->

	this.register_special_command do
		name: 'v'
		description: 'Check a resource with the W3C markup and CSS validators.'
		admin_only: false
		fn: (event, input-data, output-data) ~>

			opts = this.bot-options.plugin-options['irc-support-bot-validate']

			# Determine the URI
			if input-data.args
				uri = input-data.args
			else if output-data.recipient.0 is '#' and this.backlog[output-data.recipient]
				uri = let
					# Check the backlog for a URI
					for message in this.backlog[output-data.recipient]
						uri-match = message.match /https?:\/\/\S+/
						return uri-match.0 if uri-match
			else return

			return if not uri

			uri-truncated = js.str_truncate uri, 20, 10, '…'

			# URI or fragment?
			unless uri.match uri-regex
				is-fragment = yes
				doc = markup-fragment-tpl.replace '{{fragment}}', uri
				uri = data-uri-tpl.replace '{{doc}}', doc

			# Markup
			validate 'markup', uri, (err, result) ~>

				result-uri <~ (_) ~>
					full = "http://validator.nu/?doc=#{encodeURIComponent uri}"
					err, result <~ shorten full, opts.google-api-key
					short = result.id unless err
					_ short || full

				if err
					message = "(markup) oops, something went wrong trying to validate the document at « #{uri-truncated} » • validation result: #{result-uri}"
				else
					result := JSON.parse result
					message-types =
						'info': 0
						'error': 0
						'non-document-error': 0
						'warning': 0

					# Source
					if result.source
						result-type     = if result.source.type     then  " • type: #{result.source.type}"         else ''
						result-encoding = if result.source.encoding then  " • encoding: #{result.source.encoding}" else ''

					# Messages
					if not result.messages.length
						message = "(markup) it appears the document at « #{uri-truncated} » is valid and has no issues!#{result-type}#{result-encoding} • validation result: #{result-uri}"
					else
						# Collect message type data
						for msg in result.messages
							message-types[msg.type]++
							if msg.type is 'info' and msg.sub-type is 'warning' then message-types.warning++

						if message-types['non-document-error']
							message = "(markup) could not check the document at « #{uri-truncated} »#{result-type}#{result-encoding} • validation result: #{result-uri}"
						else
							message = "(markup) « #{uri-truncated} » errors: #{message-types.error} • warnings: #{message-types.warning}#{result-type}#{result-encoding} • validation result: #{result-uri}"

				this.send output-data.method, output-data.recipient, message if message


			# CSS
			unless is-fragment then w3c-css.validate uri, (err, result) ~>

				result-uri <~ (_) ~>
					full = "http://jigsaw.w3.org/css-validator/validator?uri=#{encodeURIComponent uri}&profile=css3"
					err, result <~ shorten full, opts.google-api-key
					short = result.id unless err
					_ short || full

				if err
					message = "(css) oops, something went wrong trying to validate the document at « #{uri-truncated} » • validation result: #{result-uri}"
				else
					if not result.errors.length and not result.warnings.length
						message = "(css) it appears the document at « #{uri-truncated} » is valid and has no issues! • validation result: #{result-uri}"
					else
						message = "(css) « #{uri-truncated} » • errors: #{result.errors.length} • warnings: #{result.warnings.length} • profile: css3 • validation result: #{result-uri}"

				this.send output-data.method, output-data.recipient, message if message


validate = (which, uri, cb) ->

	result = []

	hostname = switch which
		when 'markup' then 'checker.html5.org'
		when 'css'    then 'jigsaw.w3.org'

	path = switch which
		# when 'markup' then "/?doc=#{encodeURIComponent uri}&out=json&showsource=yes"
		when 'markup' then "/"

	conf =
		hostname: hostname
		path: path
		method: 'get'

	qs =
		doc: uri
		showsource: 'yes'
		out: 'json'

	### Both the native https module and the 'request' module result in a 200 OK, but 0 content-length response. Not sure why (all params look fine AFAICT), but a raw curl call works just fine, so doing that for now.

	curl = exec """curl "https://#hostname#path?doc=#{encodeURIComponent qs.doc}&out=#{qs.out}&showsource=#{qs.showsource}" """, (err, result, stderr) ~>
		if err
			cb stderr, null
		else
			cb null, result

	/*request do
		uri: """https://#hostname#path"""
		qs: qs
		json: yes
		callback: (err, meta, data) ->
			console.log "ERROR: " + err
			console.log "META: \n"
			console.dir meta
			console.log "RESPONSE: " + data

	res-fn = (res) ->
		res.set-encoding 'utf-8'
		res.on 'data', (data) ->
			result.push data
		res.on 'end', ->
			result := result.join ''
			cb null, result*/

	# req = http.request conf, res-fn

	# req.on 'error', (err) ->
		# cb err, null

	# req.end!
