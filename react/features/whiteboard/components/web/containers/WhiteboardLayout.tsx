// import { ExcalidrawApp } from "@jitsi/excalidraw";
import { WhiteboardApp } from "./WhiteboardContainer";
import "tldraw/tldraw.css";
import clsx from "clsx";
import i18next from "i18next";
import React, { useCallback, useEffect, useRef } from "react";
import { WithTranslation } from "react-i18next";
import { useSelector } from "react-redux";

// @ts-ignore
import Filmstrip from "../../../../../../modules/UI/videolayout/Filmstrip";
import { IReduxState } from "../../../../app/types";
import { translate } from "../../../../base/i18n/functions";
import { getLocalParticipant } from "../../../../base/participants/functions";
import { getVerticalViewMaxWidth } from "../../../../filmstrip/functions.web";
import { getToolboxHeight } from "../../../../toolbox/functions.web";
import { shouldDisplayTileView } from "../../../../video-layout/functions.any";
import { WHITEBOARD_UI_OPTIONS } from "../../../constants";
import { getCollabDetails, getCollabServerUrl, isWhiteboardOpen, isWhiteboardVisible } from "../../../functions";

/**
 * Space taken by meeting elements like the subject and the watermark.
 */
const HEIGHT_OFFSET = 80;

interface IDimensions {
    /* The height of the component. */
    height: string;

    /* The width of the component. */
    width: string;
}

/**
 * The Whiteboard component.
 *
 * @param {Props} props - The React props passed to this component.
 * @returns {JSX.Element} - The React component.
 */
const Whiteboard = (props: WithTranslation): JSX.Element => {
    // const excalidrawRef = useRef<any>(null);
    // const excalidrawAPIRef = useRef<any>(null);
    const collabAPIRef = useRef<any>(null);

    const isOpen = useSelector(isWhiteboardOpen);
    const isVisible = useSelector(isWhiteboardVisible);
    const isInTileView = useSelector(shouldDisplayTileView);
    const { clientHeight, clientWidth } = useSelector((state: IReduxState) => state["features/base/responsive-ui"]);
    const { visible: filmstripVisible, isResizing } = useSelector((state: IReduxState) => state["features/filmstrip"]);
    const filmstripWidth: number = useSelector(getVerticalViewMaxWidth);
    // const collabDetails = useSelector(getCollabDetails);
    // const collabServerUrl = useSelector(getCollabServerUrl);
    const { defaultRemoteDisplayName } = useSelector((state: IReduxState) => state["features/base/config"]);
    const localParticipantName = useSelector(getLocalParticipant)?.name || defaultRemoteDisplayName || "Fellow Jitster";

    useEffect(() => {
        if (!collabAPIRef.current) {
            return;
        }

        collabAPIRef.current.setUsername(localParticipantName);
    }, [localParticipantName]);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            // Remove Cut/Copy/Paste
            document
                .querySelectorAll(
                    '[data-testid="context-menu.cut"], [data-testid="context-menu.copy"], [data-testid="context-menu.paste"]'
                )
                .forEach((el) => el.remove());

            // Rename Duplicate
            const duplicateBtn = document.querySelector<HTMLSpanElement>(
                '[data-testid="context-menu.duplicate"] .tlui-button__label'
            );
            if (duplicateBtn && duplicateBtn.textContent !== "Copy & Paste") {
                duplicateBtn.textContent = "Copy & Paste";
            }
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        return () => observer.disconnect();
    }, []);

    /**
     * Computes the width and the height of the component.
     *
     * @returns {IDimensions} - The dimensions of the component.
     */
    const getDimensions = (): IDimensions => {
        let width: number;
        let height: number;

        // @ts-ignore
        if (interfaceConfig.VERTICAL_FILMSTRIP) {
            if (filmstripVisible) {
                width = clientWidth - filmstripWidth;
            } else {
                width = clientWidth;
            }
            height = clientHeight - getToolboxHeight();
        } else {
            if (filmstripVisible) {
                height = clientHeight - Filmstrip.getFilmstripHeight();
            } else {
                height = clientHeight;
            }
            width = clientWidth;
        }

        return {
            width: `${width}px`,
            height: `${height - HEIGHT_OFFSET}px`,
        };
    };

    return (
        <div
            className={clsx(isResizing && "disable-pointer", "whiteboard-container")}
            style={{
                ...getDimensions(),
                marginTop: `${HEIGHT_OFFSET}px`,
                display: `${isInTileView || !isVisible ? "none" : "block"}`,
            }}
        >
            {isOpen && (
                <div className="excalidraw-wrapper">
                    {
                        /*
                         * Excalidraw renders a few lvl 2 headings. This is
                         * quite fortunate, because we actually use lvl 1
                         * headings to mark the big sections of our app. So make
                         * sure to mark the Excalidraw context with a lvl 1
                         * heading before showing the whiteboard.
                         */
                        <span aria-level={1} className="sr-only" role="heading">
                            {props.t("whiteboard.accessibilityLabel.heading")}
                        </span>
                    }
                    <WhiteboardApp />
                    {/* <ExcalidrawApp
                        collabDetails={collabDetails}
                        collabServerUrl={collabServerUrl}
                        excalidraw={{
                            isCollaborating: true,
                            langCode: i18next.language,

                            // @ts-ignore
                            ref: excalidrawRef,
                            theme: "light",
                            UIOptions: WHITEBOARD_UI_OPTIONS,
                        }}
                        getCollabAPI={getCollabAPI}
                        getExcalidrawAPI={getExcalidrawAPI}
                    /> */}
                </div>
            )}
        </div>
    );
};

export default translate(Whiteboard);
