
import React, { memo, useCallback, useEffect, useState, useRef } from "react";
import { useSync } from "@tldraw/sync";
import {
    Tldraw,
    Editor,
    TLComponents,
    TldrawProps,
    useDialogs,
    TldrawUiDialogHeader,
    TldrawUiDialogTitle,
    TldrawUiDialogCloseButton,
    TldrawUiDialogBody,
    TldrawUiDialogFooter,
    TldrawUiButton,
    TldrawUiButtonLabel,
    TldrawUiInput,
    DefaultSizeStyle,
    DefaultFontStyle,
    TLUiEventHandler,
} from "tldraw";
import { multiplayerAssets, unfurlBookmarkUrl } from "./useSyncStore";
import { processSlideUrl } from "../utils/api";
import { IconTrash, IconUndo, IconRedo } from "../../../../base/icons/svg";
import { extractPresentationIdFromSlideUrl } from "../utils";
import { WORKER_URL } from "../constants";
import Icon from "../../../../base/icons/components/Icon";
import "tldraw/tldraw.css";


interface WhiteboardEditorProps extends Omit<TldrawProps, "onMount"> {
    iamModerator?: boolean;
    classId: string;
    occupantId: string;
    persistenceKey?: string;
    isInSidebar?: boolean;
    previewMode?: boolean;
    onMount?: (editor: Editor) => void;
    onActivityUpload?: (images: string[], onClose: () => void) => void;
    onActivityRemove?: () => void;
    onClearPage?: () => void;
}

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = memo(
    ({
        iamModerator = false,
        classId,
        occupantId,
        isInSidebar = false,
        previewMode = false,
        onActivityUpload,
        onActivityRemove,
        onClearPage,
        onMount,
        ...rest
    }) => {
        const roomId = `${classId}-${occupantId}`;
        const [editor, setEditor] = useState<Editor | null>(null);
        const lastSyncedPageRef = useRef<string | null>(null);
        const isSyncingRef = useRef(false);

        const store = useSync({
            uri: `${WORKER_URL}/connect/${roomId}`,
            assets: multiplayerAssets,
            userInfo: { id: occupantId },
        });

        // Function to set page to IA-01 if it exists
        const setToFirstIAPage = useCallback((editor: Editor) => {
            const pages = editor.getPages();
            const iaPages = pages.filter(page => page.id.includes('page:IA'));
            
            if (iaPages.length > 0) {
                const firstIAPage = iaPages.find(page => page.id === 'page:IA-01');
                if (firstIAPage) {
                    editor.setCurrentPage(firstIAPage.id);
                    editor.setCameraOptions({ isLocked: true });
                    editor.zoomToFit({ force: true, immediate: true });
                    lastSyncedPageRef.current = firstIAPage.id;
                }
            }
        }, []);

        // Handle initial mount and IA page detection
        useEffect(() => {
            if (!editor || iamModerator) return;
            
            // Set to IA-01 on initial mount if it exists
            setToFirstIAPage(editor);

            // Listen for store changes - but don't auto-switch to first page on every change
            const unsubscribe = editor.store.listen((record) => {
                // Only handle camera settings based on current page, not page switching
                const currentPageId = editor.getCurrentPageId();
                if (currentPageId.includes("page:IA") || isInSidebar) {
                    editor.zoomToFit({ force: true, immediate: true }).setCameraOptions({ isLocked: true });
                } else if (!isSyncingRef.current) {
                    editor.setCameraOptions({ isLocked: false });
                }
            }, {
                scope: 'all',
                source: 'remote'
            });

            return () => unsubscribe();
        }, [editor, iamModerator, setToFirstIAPage, isInSidebar]);

        const UploadSlideDialog = ({ onClose }: { onClose(): void }) => {
            const [link, setLink] = useState<string | null>(null);
            const [loading, setLoading] = useState<boolean>(false);
            const [error, setError] = useState<string | null>(null);
        
            const handleUpload = async () => {
                if (!link) return;
        
                try {
                    setLoading(true);
                    setError(null);
        
                    const presentationId = extractPresentationIdFromSlideUrl(link);
                    if (!presentationId) {
                        setError("Invalid Google Slides link. Please enter a valid URL.");
                        return;
                    }
        
                    const images = await processSlideUrl(presentationId);
                    onActivityUpload?.(images, onClose);
        
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
        
            return (
                <>
                    <TldrawUiDialogHeader>
                        <TldrawUiDialogTitle className="font-bold">Create Interactive Activity</TldrawUiDialogTitle>
                        <TldrawUiDialogCloseButton />
                    </TldrawUiDialogHeader>
                    <TldrawUiDialogBody>
                        {/* @ts-ignore */}
                        <TldrawUiInput placeholder="Enter Google Slides URL" onValueChange={setLink} />
                        {error && (
                            <div 
                                className="error-message" 
                                style={{ 
                                    color: '#dc2626',
                                    marginTop: '8px',
                                    fontSize: '14px',
                                    padding: '8px',
                                    backgroundColor: '#fee2e2',
                                    borderRadius: '4px',
                                    border: '1px solid #fca5a5',
                                    whiteSpace: 'pre-line'
                                }}
                            >
                                {error}
                            </div>
                        )}
                    </TldrawUiDialogBody>
                    <TldrawUiDialogFooter className="tlui-dialog__footer__actions">
                        {/* @ts-ignore */}
                        <TldrawUiButton type="normal" onClick={onClose}>
                            <TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
                        </TldrawUiButton>
                        {/* @ts-ignore */}
                        <TldrawUiButton 
                            type="primary" 
                            disabled={loading || !link}
                            onClick={handleUpload}
                        >
                            <TldrawUiButtonLabel>
                                {loading ? "Please Wait..." : "Upload"}
                            </TldrawUiButtonLabel>
                        </TldrawUiButton>
                    </TldrawUiDialogFooter>
                </>
            );
        };

        const CustomSharePanelForModerator = () => {
            const { addDialog } = useDialogs();
            return (
                <div style={{ padding: 16, gap: 16, display: "flex", pointerEvents: "all" }}>
                    {!previewMode && (
                        <>
                            <button
                                className="primary-button"
                                onClick={() => addDialog({ component: UploadSlideDialog })}
                            >
                                Create Activity
                            </button>
                            <button
                                className="primary-button"
                                onClick={() =>
                                    addDialog({
                                        component: ({ onClose }) => {
                                            onActivityRemove?.();
                                            onClose();
                                            return <></>;
                                        },
                                    })
                                }
                            >
                                Remove Link
                            </button>
                        </>
                    )}
                    <button
                        className="primary-button"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                        onClick={() => editor?.undo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconUndo} alt="undo-icon" size={18} />
                    </button>
                    <button
                        className="primary-button"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                        onClick={() => editor?.redo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconRedo} alt="redo-icon" size={18} />
                    </button>
                    {!previewMode && (
                        <button
                            className="primary-button"
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                            onClick={onClearPage}
                        >
                            {/* @ts-ignore */}
                            <Icon src={IconTrash} alt="eraser-icon" size={16} />
                        </button>
                    )}
                </div>
            );
        };

        const CustomSharePanelForParticipant = () => {
            return (
                <div style={{ padding: 16, gap: 16, display: "flex", pointerEvents: "all" }}>
                    <button
                        className="primary-button"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                        onClick={() => editor?.undo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconUndo} alt="undo-icon" size={18} />
                    </button>
                    <button
                        className="primary-button"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                        onClick={() => editor?.redo()}
                    >
                        {/* @ts-ignore */}
                        <Icon src={IconRedo} alt="redo-icon" size={18} />
                    </button>
                    {!previewMode && (
                        <button
                            className="primary-button"
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                            onClick={onClearPage}
                        >
                            {/* @ts-ignore */}
                            <Icon src={IconTrash} alt="trash-icon" size={16} />
                        </button>
                    )}
                </div>
            );
        };

        const renameDefaultPageonLoad = (editor: Editor) => {
            const pages = editor.getPages();
            const whiteboardExists = pages.some((page) => page.name === "Whiteboard");

            if (!whiteboardExists) {
                const currentPage = editor.getCurrentPage();
                if (currentPage && currentPage.name === "Page 1") {
                    editor.renamePage(currentPage.id, "Whiteboard");
                }
            }
        };

        const setDefaultFontStyling = (editor: Editor) => {
            editor?.setStyleForNextShapes(DefaultSizeStyle, "l", { history: "ignore" });
            editor?.setStyleForNextShapes(DefaultFontStyle, "sans", { history: "ignore" });
        };

        useEffect(() => {
            if (!editor) return;

            setDefaultFontStyling(editor);
            renameDefaultPageonLoad(editor);
        }, [editor]);

        // Main sync logic - handles remote changes and camera settings
        useEffect(() => {
            if (!editor) return;

            const handleChangeEvent = (change: any) => {
                Object.values(change.changes.updated).forEach(([from, to]: any) => {
                    // Handle page changes from remote sources (moderator in preview mode)
                    if (from?.currentPageId !== undefined && to?.currentPageId !== undefined && 
                        from.currentPageId !== to.currentPageId) {
                        
                        const newPageId = to.currentPageId;
                        const currentPageId = editor.getCurrentPageId();
                        
                        // Only sync if:
                        // 1. We're not a moderator (students should sync)
                        // 2. The page is different from current
                        // 3. We haven't already synced to this page (prevent loops)
                        // 4. We're not currently in the middle of a sync operation
                        if (!iamModerator && newPageId !== currentPageId && 
                            newPageId !== lastSyncedPageRef.current && !isSyncingRef.current) {
                            
                            console.log(`Syncing student to page: ${newPageId}`);
                            isSyncingRef.current = true;
                            
                            // Use requestAnimationFrame to ensure smooth transition
                            requestAnimationFrame(() => {
                                try {
                                    editor.setCurrentPage(newPageId);
                                    editor.setCameraOptions({ isLocked: true });
                                    editor.zoomToFit({ force: true, immediate: true });
                                    lastSyncedPageRef.current = newPageId;
                                } finally {
                                    // Reset sync flag after a short delay
                                    setTimeout(() => {
                                        isSyncingRef.current = false;
                                    }, 100);
                                }
                            });
                        }
                    }

                    // Handle camera settings based on current page
                    const currentPageId = editor.getCurrentPageId();
                    if (currentPageId.includes("page:IA") || isInSidebar) {
                        editor.zoomToFit({ force: true, immediate: true }).setCameraOptions({ isLocked: true });
                    } else if (!isSyncingRef.current) {
                        editor.setCameraOptions({ isLocked: false });
                    }
                });
            };

            const cleanupFunction = editor.store.listen(handleChangeEvent, {
                scope: "all",
                source: "remote",
            });

            return () => {
                cleanupFunction();
            };
        }, [editor, isInSidebar, iamModerator]);

        // Handle moderator's own page changes (for zoom/camera settings)
        useEffect(() => {
            if (!editor || isInSidebar || previewMode) return;
            
            const handlePageChange = () => {
                const currentPageId = editor.getCurrentPageId();

                if (currentPageId.includes("page:IA")) {
                    console.log("handlePageChange called for moderator");
                    editor.setCameraOptions({ isLocked: false });
                    editor.zoomToFit({ force: true, immediate: true });
                }
            };

            const removeListener = editor.store.listen(() => {
                if (!isSyncingRef.current) {
                    handlePageChange();
                }
            }, {
                scope: 'all',
                source: 'user',
            });

            return () => {
                removeListener();
            };
        }, [editor, isInSidebar, previewMode]);

        // Backup sync mechanism for instancePageState changes
        useEffect(() => {
            if (!editor || iamModerator) return;
        
            const unsubscribe = editor.store.listen(
                (record) => {
                    const pageStateUpdates = record.changes?.['instancePageState']?.updated;
        
                    if (!pageStateUpdates || pageStateUpdates.length === 0 || isSyncingRef.current) return;
        
                    const [, newPageState] = pageStateUpdates[0];
                    const newPageId = newPageState?.current;
                    const currentPageId = editor.getCurrentPageId();
        
                    if (newPageId && newPageId !== currentPageId && newPageId !== lastSyncedPageRef.current) {
                        console.log(`Backup sync to page: ${newPageId}`);
                        isSyncingRef.current = true;
                        
                        requestAnimationFrame(() => {
                            try {
                                editor.setCurrentPage(newPageId);
                                editor.setCameraOptions({ isLocked: true });
                                editor.zoomToFit({ force: true, immediate: true });
                                lastSyncedPageRef.current = newPageId;
                            } finally {
                                setTimeout(() => {
                                    isSyncingRef.current = false;
                                }, 100);
                            }
                        });
                    }
                },
                {
                    scope: "all",
                    source: "remote",
                }
            );
        
            return () => {
                unsubscribe();
            };
        }, [editor, iamModerator]);

        const components: TLComponents = {
            ...{
                SharePanel: iamModerator ? CustomSharePanelForModerator : CustomSharePanelForParticipant,
                Minimap: null,
                ZoomMenu: null,
                ...(previewMode && !iamModerator && { PageMenu: null }),
            },
        };

        const onUiEvent = useCallback<TLUiEventHandler>((name, _: any) => {
            if (name.toString() === "zoom-to-content") {
                editor?.zoomToFit({ force: true, immediate: true });
                editor?.resetZoom();
            }
        }, []);

        return (
            <div>
                <Tldraw
                    store={store}
                    forceMobile={true}
                    components={components}
                    onUiEvent={onUiEvent}
                    onMount={(editor) => {
                        setEditor(editor);
                        editor.registerExternalAssetHandler("url", unfurlBookmarkUrl);

                        if (onMount) onMount(editor);
                    }}
                    {...rest}
                />
            </div>
        );
    }
);