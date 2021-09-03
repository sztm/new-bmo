import {
    LambdaRequest,
    LambdaResponse,
    SlackMessage,
    RegexTable,
} from '../types';
import { HTTP_200, HTTP_400 } from '../response_templates';
import { WebClient } from '@slack/web-api';
import { getWord, addWord } from '../ddb_helper';

const BMO_REGEX: RegexTable = {
    vote: /^\S+(\+\+|--)\s/,
    word: /\!word\s\S+/,
    words: /^\!words$/,
    add: /^\!add\s\S+/,
};

exports.handler = async function (
    event: LambdaRequest,
    context: any
): Promise<LambdaResponse> {
    //console.log('EVENT: \n' + JSON.stringify(event, null, 2));

    // return error response if request body is empty
    if (event.body === null) {
        return HTTP_400;
    }

    let lambdaEvent;
    try {
        lambdaEvent = JSON.parse(event.body);
    } catch (err) {
        // Request body is not JSON syntax
        console.error(err);
        return HTTP_400;
    }

    // Handle challenge request
    const challenge = lambdaEvent.challenge;
    if (challenge) {
        const body = {
            challenge: challenge,
        };
        const response: LambdaResponse = {
            statusCode: 200,
            body: JSON.stringify(body),
        };
        return response;
    }

    // Handle message
    const wordTable = process.env.WORD_TABLE || '';
    const voteTable = process.env.VOTE_TABLE || '';
    const web = new WebClient(process.env.SLACK_TOKEN);
    const message: SlackMessage = getMessage(lambdaEvent);

    if (isBMO(message)) {
        // Return immediately if the message is posted by BMO
        return HTTP_200;
    } else {
        console.log(message.text);
        const commentType = searchRegex(message);
        let reply = '';
        switch (commentType) {
            case 'vote':
                reply = '++/-- はまだ未実装だよ。ごめんね。';
                break;
            case 'word':
                const wq = parseWord(message.text);
                const wa = await getWord(wq, 'word', wordTable);
                reply = `${wq}: ${wa}`;
                break;
            case 'words':
                reply = 'word 一覧はまだ未実装だよ。ごめんね。';
                break;
            case 'add':
                const aq = parseAdd(message.text);
                if (aq.length < 2) {
                    reply = 'コマンドがおかしいみたい';
                } else {
                    reply = await addWord(aq[0], aq[1], wordTable);
                }
                break;
            default:
                return HTTP_200;
        }
        try {
            await web.chat.postMessage({
                channel: message.channel,
                text: reply,
            });
        } catch (err) {
            console.log(err);
        }
    }

    return HTTP_200;
};

function getMessage(lambdaEvent: { [key: string]: any }): SlackMessage {
    const defaultMessage: SlackMessage = {
        text: '',
        user: '',
        channel: '',
    };

    if (!lambdaEvent.event) {
        return defaultMessage;
    }

    const slackEvent = lambdaEvent.event;
    return {
        text: slackEvent.text || defaultMessage.text,
        user: slackEvent.user || defaultMessage.user,
        channel: slackEvent.channel || defaultMessage.channel,
    };
}

function isBMO(message: SlackMessage): boolean {
    return message.user == process.env.APP_UNAME;
}

function searchRegex(message: SlackMessage): string {
    const text = message.text;
    for (let key in BMO_REGEX) {
        if (text.match(BMO_REGEX[key]) != null) {
            return key;
        }
    }
    return '';
}

function parseWord(text: string): string {
    const words = text.split(' ');
    if (words.length > 1) {
        return words[1];
    }
    return '';
}

function parseAdd(text: string): string[] {
    /**
     *  Return structure will be...
     *  1. If an input has '!add', 'key', and 'comment'
     *     -> ['key', 'comment']
     *  2. If an input is incorrect format
     *     -> []
     */
    const words = text.split(' ');
    const ret: string[] = [];

    if (words.length < 3) return ret;

    ret[0] = words[1];
    ret[1] = words.slice(2).join(' ');
    return ret;
}
