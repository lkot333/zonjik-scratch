
import classNames from 'classnames';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';
import intlShape from '../../lib/intlShape.js';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import VM from '@scratch/scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import CommunityButton from './community-button.jsx';
import ShareButton from './share-button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
import SaveStatus from './save-status.jsx';
import ProjectWatcher from '../../containers/project-watcher.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import SettingsMenu from './settings-menu.jsx';
import FileMenu from './file-menu.jsx';
import EditMenu from './edit-menu.jsx';
import ModeMenu from './mode-menu.jsx';
import AboutMenu from './about-menu.jsx';

import {openTipsLibrary, openDebugModal} from '../../reducers/modals';
import {setPlayer} from '../../reducers/mode';
import {
    isTimeTravel220022BC,
    isTimeTravel1920,
    isTimeTravel1990,
    isTimeTravel2020,
    isTimeTravelNow,
    setTimeTravel
} from '../../reducers/time-travel';
import {
    autoUpdateProject,
    getIsUpdating,
    getIsShowingProject,
    requestNewProject,
    manualUpdateProject,
    remixProject
} from '../../reducers/project-state';

import collectMetadata from '../../lib/collect-metadata';
import {PLATFORM} from '../../lib/platform';

import styles from './menu-bar.css';

import helpIcon from '../../lib/assets/icon--tutorials.svg';
import remixIcon from './icon--remix.svg';
import debugIcon from '../debug-modal/icons/icon--debug.svg';

import scratchLogo from './zonjikblocks.png';
import scratchLogoAndroid from './scratch-logo-android.svg';
import ninetiesLogo from './nineties_logo.svg';
import catLogo from './cat_logo.svg';
import prehistoricLogo from './prehistoric-logo.svg';
import oldtimeyLogo from './oldtimey-logo.svg';

import sharedMessages from '../../lib/shared-messages';

const ariaMessages = defineMessages({
    tutorials: {
        id: 'gui.menuBar.tutorialsLibrary',
        defaultMessage: 'Tutorials',
        description: 'accessibility text for the tutorials button'
    },
    debug: {
        id: 'gui.menuBar.debug',
        defaultMessage: 'Debug',
        description: 'accessibility text for the debug button'
    },
    home: {
        id: 'gui.menuBar.home',
        defaultMessage: 'Home',
        description: 'accessibility text for the home button'
    }
});

const getScratchLogo = platform => (
    platform === PLATFORM.ANDROID ? scratchLogoAndroid : scratchLogo
);

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (enable) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }

    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};

MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickNew',
            'handleClickSeeCommunity',
            'handleClickShare',
            'handleSetMode',
            'handleKeyPress',
            'handleRestoreOption',
            'getSaveToComputerHandler',
            'restoreOptionMessage'
        ]);
    }

    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
    }

    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }

    handleClickNew () {
        const readyToReplaceProject = this.props.confirmReadyToReplaceProject(
            this.props.intl.formatMessage(sharedMessages.replaceProjectWarning)
        );

        if (readyToReplaceProject) {
            this.props.onClickNew(this.props.canSave && this.props.canCreateNew);
        }
    }

    handleClickSeeCommunity (waitForUpdate) {
        if (this.props.shouldSaveBeforeTransition()) {
            this.props.autoUpdateProject();
            waitForUpdate({
                isSaving: true
            });
        } else {
            waitForUpdate();
        }
    }

    handleClickShare (waitForUpdate) {
        if (!this.props.isShared) {
            if (this.props.canShare) {
                this.props.onShare();
            }

            if (this.props.canSave) {
                this.props.autoUpdateProject();
                waitForUpdate({
                    isSaving: true,
                    isSharing: true
                });
            }
        }
    }

    handleSetMode (mode) {
        return () => {
            if (mode === '1920') {
                document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
                document.documentElement.style.height = '100%';
            } else if (mode === '1990') {
                document.documentElement.style.filter = 'hue-rotate(40deg)';
                document.documentElement.style.height = '100%';
            } else {
                document.documentElement.style.filter = '';
                document.documentElement.style.height = '';
            }

            if (mode === '1990') {
                document.getElementById('logo_img').src = ninetiesLogo;
            } else if (mode === '2020') {
                document.getElementById('logo_img').src = catLogo;
            } else if (mode === '1920') {
                document.getElementById('logo_img').src = oldtimeyLogo;
            } else if (mode === '220022BC') {
                document.getElementById('logo_img').src = prehistoricLogo;
            } else {
                document.getElementById('logo_img').src = getScratchLogo(this.props.platform);
            }

            this.props.onSetTimeTravelMode(mode);
        };
    }

    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
        };
    }

    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;

        if (modifier && event.key === 's') {
            this.props.onClickSave();
            event.preventDefault();
        }
    }

    getSaveToComputerHandler (downloadProjectCallback) {
        return () => {
            downloadProjectCallback();

            if (this.props.onProjectTelemetryEvent) {
                const metadata = collectMetadata(
                    this.props.vm,
                    this.props.projectTitle,
                    this.props.locale
                );

                this.props.onProjectTelemetryEvent('projectDidSave', metadata);
            }
        };
    }

    restoreOptionMessage (deletedItem) {
        switch (deletedItem) {
        case 'Sprite':
            return (
                <FormattedMessage
                    defaultMessage="Restore Sprite"
                    description="Menu bar item for restoring the last deleted sprite."
                    id="gui.menuBar.restoreSprite"
                />
            );
        case 'Sound':
            return (
                <FormattedMessage
                    defaultMessage="Restore Sound"
                    description="Menu bar item for restoring the last deleted sound."
                    id="gui.menuBar.restoreSound"
                />
            );
        case 'Costume':
            return (
                <FormattedMessage
                    defaultMessage="Restore Costume"
                    description="Menu bar item for restoring the last deleted costume."
                    id="gui.menuBar.restoreCostume"
                />
            );
        default:
            return (
                <FormattedMessage
                    defaultMessage="Restore"
                    description="Menu bar item for restoring the last deleted item in its disabled state."
                    id="gui.menuBar.restore"
                />
            );
        }
    }

    render () {
        return (
            <Box
                className={classNames(
                    this.props.className,
                    styles.menuBar
                )}
                aria-label={this.props.ariaLabel}
                role={this.props.ariaRole}
                element="header"
            >
                <div className={styles.mainMenu}>
                    <div className={styles.fileGroup}>
                        <button
                            aria-label={this.props.intl.formatMessage(ariaMessages.home)}
                            className={classNames(styles.menuBarItem)}
                            onClick={this.props.onClickLogo}
                        >
                            <img
                                id="logo_img"
                                alt="Zonjik"
                                className={classNames(styles.scratchLogo, {
                                    [styles.clickable]: typeof this.props.onClickLogo !== 'undefined'
                                })}
                                draggable={false}
                                src={getScratchLogo(this.props.platform)}
                            />
                        </button>

                        {(this.props.canChangeColorMode ||
                            this.props.canChangeLanguage ||
                            this.props.canChangeTheme) && (
                            <SettingsMenu
                                canChangeLanguage={this.props.canChangeLanguage}
                                canChangeColorMode={this.props.canChangeColorMode}
                                canChangeTheme={this.props.canChangeTheme}
                                hasActiveMembership={this.props.hasActiveMembership}
                                isRtl={this.props.isRtl}
                                depth={1}
                            />
                        )}

                        {this.props.canManageFiles && (
                            <FileMenu
                                onStartSelectingFileUpload={this.props.onStartSelectingFileUpload}
                                onClickNew={this.handleClickNew}
                                onClickRemix={this.props.onClickRemix}
                                onClickSave={this.props.onClickSave}
                                getSaveToComputerHandler={this.getSaveToComputerHandler}
                                canSave={this.props.canSave}
                                canCreateCopy={this.props.canCreateCopy}
                                canRemix={this.props.canRemix}
                                intl={this.props.intl}
                                isRtl={this.props.isRtl}
                                depth={1}
                            />
                        )}

                        <EditMenu
                            isRtl={this.props.isRtl}
                            onRestoreOption={this.handleRestoreOption}
                            restoreOptionMessage={this.restoreOptionMessage}
                            depth={1}
                        />

                        {this.props.isTotallyNormal && (
                            <ModeMenu
                                onSetMode={this.handleSetMode}
                                modeNow={this.props.modeNow}
                                mode2020={this.props.mode2020}
                                isRtl={this.props.isRtl}
                                depth={1}
                            />
                        )}
                    </div>

                    {this.props.canEditTitle ? (
                        <div className={classNames(styles.menuBarItem, styles.growable)}>
                            <MenuBarItemTooltip enable id="title-field">
                                <ProjectTitleInput
                                    className={classNames(styles.titleFieldGrowable)}
                                />
                            </MenuBarItemTooltip>
                        </div>
                    ) : (
                        (this.props.authorUsername &&
                            this.props.authorUsername !== this.props.username) ? (
                            <AuthorInfo
                                className={styles.authorInfo}
                                imageUrl={this.props.authorThumbnailUrl}
                                projectTitle={this.props.projectTitle}
                                userId={this.props.authorId}
                                username={this.props.authorUsername}
                                avatarBadge={this.props.authorAvatarBadge}
                            />
                        ) : null
                    )}

                    <div className={classNames(styles.menuBarItem)}>
                        {this.props.canShare ? (
                            (this.props.isShowingProject || this.props.isUpdating) && (
                                <ProjectWatcher
                                    onDoneUpdating={this.props.onSeeCommunity}
                                    isShared={this.props.isShared}
                                >
                                    {waitForUpdate => (
                                        <ShareButton
                                            className={styles.menuBarButton}
                                            isShared={this.props.isShared}
                                            onClick={() => {
                                                this.handleClickShare(waitForUpdate);
                                            }}
                                        />
                                    )}
                                </ProjectWatcher>
                            )
                        ) : (
                            this.props.showComingSoon ? (
                                <MenuBarItemTooltip id="share-button">
                                    <ShareButton className={styles.menuBarButton} />
                                </MenuBarItemTooltip>
                            ) : []
                        )}
                    </div>

                    <div className={classNames(styles.menuBarItem, styles.communityButtonWrapper)}>
                        {this.props.enableCommunity ? (
                            (this.props.isShowingProject || this.props.isUpdating) && (
                                <ProjectWatcher onDoneUpdating={this.props.onSeeCommunity}>
                                    {waitForUpdate => (
                                        <CommunityButton
                                            className={styles.menuBarButton}
                                            onClick={() => {
                                                this.handleClickSeeCommunity(waitForUpdate);
                                            }}
                                        />
                                    )}
                                </ProjectWatcher>
                            )
                        ) : (
                            this.props.showComingSoon ? (
                                <MenuBarItemTooltip id="community-button">
                                    <CommunityButton className={styles.menuBarButton} />
                                </MenuBarItemTooltip>
                            ) : []
                        )}
                    </div>

                    <Divider className={classNames(styles.divider)} />

                    <div className={styles.fileGroup}>
                        <button
                            aria-label={this.props.intl.formatMessage(ariaMessages.tutorials)}
                            className={classNames(
                                styles.menuBarItem,
                                styles.noOffset,
                                styles.hoverable,
                                'tutorials-button'
                            )}
                            onClick={this.props.onOpenTipLibrary}
                        >
                            <img className={styles.helpIcon} src={helpIcon} />
                            <span className={styles.tutorialsLabel}>
                                <FormattedMessage {...ariaMessages.tutorials} />
                            </span>
                        </button>

                        <button
                            aria-label={this.props.intl.formatMessage(ariaMessages.debug)}
                            className={classNames(
                                styles.menuBarItem,
                                styles.noOffset,
                                styles.hoverable
                            )}
                            onClick={this.props.onOpenDebugModal}
                        >
                            <img className={styles.helpIcon} src={debugIcon} />
                            <span className={styles.debugLabel}>
                                <FormattedMessage {...ariaMessages.debug} />
                            </span>
                        </button>
                    </div>
                </div>

                <div className={styles.accountInfoGroup}>
                    {this.props.canSave && (
                        <SaveStatus
                            className={classNames(styles.hoverable, styles.menuBarItem)}
                        />
                    )}
                </div>

                {this.props.onClickAbout && (
                    <AboutMenu
                        onClick={this.props.onClickAbout}
                        isRtl={this.props.isRtl}
                        depth={1}
                    />
                )}
            </Box>
        );
    }
}

MenuBar.propTypes = {
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorAvatarBadge: PropTypes.number,
    autoUpdateProject: PropTypes.func,
    canChangeLanguage: PropTypes.bool,
    canChangeColorMode: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    confirmReadyToReplaceProject: PropTypes.func,
    currentLocale: PropTypes.string.isRequired,
    enableCommunity: PropTypes.bool,
    hasActiveMembership: PropTypes.bool,
    intl: intlShape,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    isUpdating: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    logo: PropTypes.string,
    mode1920: PropTypes.bool,
    mode1990: PropTypes.bool,
    mode2020: PropTypes.bool,
    mode220022BC: PropTypes.bool,
    modeNow: PropTypes.bool,
    onClickAbout: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.arrayOf(
            PropTypes.shape({
                title: PropTypes.string,
                onClick: PropTypes.func
            })
        )
    ]),
    onClickLogo: PropTypes.func,
    onClickMode: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onOpenDebugModal: PropTypes.func,
    onProjectTelemetryEvent: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onSetTimeTravelMode: PropTypes.func,
    onShare: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    platform: PropTypes.oneOf(Object.keys(PLATFORM)),
    projectTitle: PropTypes.string,
    shouldSaveBeforeTransition: PropTypes.func,
    showComingSoon: PropTypes.bool,
    username: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};

MenuBar.defaultProps = {
    logo: scratchLogo,
    onShare: () => {}
};

const mapStateToProps = state => {
    const loadingState = state.scratchGui.projectState.loadingState;

    return {
        currentLocale: state.locales.locale,
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        locale: state.locales.locale,
        projectTitle: state.scratchGui.projectTitle,
        vm: state.scratchGui.vm,
        mode220022BC: isTimeTravel220022BC(state),
        mode1920: isTimeTravel1920(state),
        mode1990: isTimeTravel1990(state),
        mode2020: isTimeTravel2020(state),
        modeNow: isTimeTravelNow(state),
        platform: state.scratchGui.platform.platform
    };
};

const mapDispatchToProps = (dispatch, ownProps) => ({
    autoUpdateProject: () => dispatch(autoUpdateProject()),
    onOpenTipLibrary: () => dispatch(openTipsLibrary()),
    onOpenDebugModal: () => dispatch(openDebugModal()),
    onClickNew: needSave => dispatch(requestNewProject(needSave)),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickRemix: () => dispatch(remixProject()),
    onSeeCommunity: ownProps.onSeeCommunity ?? (() => dispatch(setPlayer(true))),
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode))
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);
