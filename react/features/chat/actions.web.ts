// @ts-expect-error
import VideoLayout from '../../../modules/UI/videolayout/VideoLayout';
import { IStore } from '../app/types';

import { CHAT_OPEN_FOR_OTHERS, OPEN_CHAT } from './actionTypes';
import { closeChat } from './actions.any';

export * from './actions.any';

/**
 * Displays the chat panel.
 *
 * @param {Object} participant - The recipient for the private chat.
 * @param {Object} _disablePolls - Used on native.
 * @returns {{
 *     participant: Participant,
 *     type: OPEN_CHAT
 * }}
 */
export function openChat(participant?: Object, _disablePolls?: boolean) {
    return function (dispatch: IStore['dispatch']) {
        dispatch({
            participant,
            type: OPEN_CHAT
        });
    };
}

/**
 * Displays the chat panel.
 *
 * @param {Object} value - The boolean status for chat open for other participants.
 * @returns {{
*    type: CHAT_OPEN_FOR_OTHERS
*     isChatOpenForOthers: Boolean,
* }}
*/
export function openChatForOtherParticipants(value: boolean) {
    return function (dispatch: IStore['dispatch']) {
        dispatch({
            type: CHAT_OPEN_FOR_OTHERS,
            isChatOpenForOthers: value
        });
    };
}


/**
 * Toggles display of the chat panel.
 *
 * @returns {Function}
 */
export function toggleChat() {
    return (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const isOpen = getState()['features/chat'].isOpen;

        if (isOpen) {
            dispatch(closeChat());
        } else {
            dispatch(openChat());
        }

        // Recompute the large video size whenever we toggle the chat, as it takes chat state into account.
        VideoLayout.onResize();
    };
}
