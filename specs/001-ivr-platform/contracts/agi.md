# AGI Contracts

## Incoming AGI Variables from Asterisk
When a call hits the FastAGI server, Asterisk sends environment variables including:
- `agi_channel`: The Asterisk channel ID (used as `call_id`).
- `agi_callerid`: The incoming caller's phone number.
- `agi_extension`: The dialed number/extension.
- `agi_arg_1`: The `flow_id` to execute (passed from dialplan).

## AGI Response Commands
The FastAGI server responds with standard AGI commands:
- `PLAYBACK {audio_file}`: Plays an audio prompt.
- `GET DATA {audio_file} {timeout} {max_digits}`: Collects DTMF input.
- `BRIDGE {destination}`: Transfers the call.
- `HANGUP`: Terminates the call.
