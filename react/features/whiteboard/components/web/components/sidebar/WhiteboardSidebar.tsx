import React, { useCallback } from "react";
import { computed, Editor, react, TLRecord } from "tldraw";
import { WhiteboardEditor } from "../../core/WhiteboardEditor";

interface SidebarI {
    iamModerator: boolean | null;
    occupants: Array<any>;
    onPreviewClick: Function;
    classId: string;
    editorsRef: React.MutableRefObject<Map<string, Editor>>;
}

const Sidebar = ({ iamModerator, occupants, onPreviewClick, editorsRef, classId }: SidebarI) => {
    const items = iamModerator
        ? occupants.filter((el) => el.role === "participant") // Show students for moderators
        : occupants.filter((el) => el.role === "moderator"); // Show tutor for students

    const onMount = useCallback((occupantId: string, editor: Editor) => {
        const isLeader = false;

        const latestLeaderPresence = computed("latestLeaderPresence", () => {
            return editor.getCollaborators().find((p) => p.userId.includes(occupantId));
        });

        const dispose = react("update current page", () => {
            if (isLeader) return; // The leader doesn't follow anyone

            const leaderPresence = latestLeaderPresence.get();
            if (!leaderPresence) {
                editor.stopFollowingUser();
                return;
            }

            if (
                leaderPresence.currentPageId !== editor.getCurrentPageId() &&
                editor.getPage(leaderPresence.currentPageId)
            ) {
                editor.run(
                    () => {
                        editor.store.put([
                            {
                                ...editor.getInstanceState(),
                                currentPageId: leaderPresence.currentPageId,
                            },
                        ]);
                        editor.startFollowingUser(leaderPresence.userId);
                    },
                    { history: "ignore" }
                );
            }
        });

        return () => {
            dispose();
        };
    }, []);

    return (
        <div className="sidebar">
            {items?.length > 0 ? (
                <div className="sidebar__content">
                    {items.map((occupant, index) => (
                        <div key={index} className="sidebar__item">
                            <div className="sidebar__item__header">
                                <h4>{iamModerator ? occupant.name : "Tutor's Board"}</h4>
                                <button
                                    className="primary-button"
                                    style={{ padding: "6px 14px", fontSize: 12 }}
                                    onClick={() => onPreviewClick(String(occupant.name).toLowerCase())}
                                >
                                    Preview
                                </button>
                            </div>

                            <div className="sidebar__item__content">
                                <div className="overlay" />
                                <WhiteboardEditor
                                    key={String(occupant?.name).toLowerCase()}
                                    classId={classId}
                                    occupantId={String(occupant?.name).toLowerCase()}
                                    className="whiteboard-editor"
                                    autoFocus={false}
                                    isInSidebar={true}
                                    hideUi={true}
                                    onMount={(editor) => {
                                        const occupantId = String(occupant?.name).toLowerCase();

                                        editorsRef?.current.set(occupantId, editor);

                                        onMount(occupantId, editor);

                                        // handleEditorMount(editor);

                                        editor.zoomToFit({ force: true });
                                    }}
                                    previewMode={true}
                                    cameraOptions={{
                                        isLocked: true,
                                        wheelBehavior: "none",
                                        panSpeed: 0,
                                        zoomSpeed: 0,
                                        zoomSteps: [1],
                                        constraints: {
                                            initialZoom: "fit-x-100",
                                            baseZoom: "fit-x-100",
                                            bounds: {
                                                x: 0,
                                                y: 0,
                                                w: 1920,
                                                h: 1080,
                                            },
                                            behavior: { x: "contain", y: "contain" },
                                            padding: { x: 0, y: 0 },
                                            origin: { x: 0, y: 0 },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="centered-content" style={{ fontSize: 14, color: "#329732" }}>
                    No active participants.
                </div>
            )}
        </div>
    );
};

export { Sidebar };
