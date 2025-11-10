import { useMemo } from 'react'
import { DailyAudio, DailyVideo, useLocalSessionId, useParticipant } from '@daily-co/daily-react'
import styled from 'styled-components'

import { useBroadcastStore } from '../state/broadcastStore'
import { useCommunicationState } from '../hooks/useCommunicationState'
import { useDailyController } from '../hooks/useDailyController'
import { useDesktopSources } from '../hooks/useDesktopSources'
import type { DesktopSourceSummary } from '../types/desktop'

const MAX_LOG_LINES = 200

export const BroadcastApp = () => {
  const {
    selectedSourceId,
    isPreviewMuted,
    livestream,
    logs,
    addLog,
    setSelectedSource,
    setLivestreamConfig,
    setPreviewMuted,
  } = useBroadcastStore()

  const { state: commsState, loading: commsLoading, error: commsError } = useCommunicationState()
  const { sources, loading: sourcesLoading, error: sourcesError, refresh: refreshSources } = useDesktopSources()

  const {
    startScreenShare,
    stopScreenShare,
    startLivestream,
    stopLivestream,
    dailyStatus: derivedDailyStatus,
    screenShareStatus: derivedScreenStatus,
    livestreamStatus: derivedLiveStatus,
    isJoined,
  } = useDailyController()

  const commsStatusLabel = useMemo(() => {
    if (commsLoading) {
      return 'Detecting local network…'
    }
    if (commsError) {
      return 'Local server unavailable'
    }
    if (!commsState) {
      return 'Local server offline'
    }
    return `Local server online • Port ${commsState.port}`
  }, [commsError, commsLoading, commsState])

  const handleSelectSource = (source: DesktopSourceSummary) => {
    setSelectedSource(source.id)
    addLog('info', `Selected ${source.type === 'screen' ? 'screen' : 'window'} source: ${source.name}`)
  }

  const truncatedLogs = useMemo(() => {
    if (logs.length <= MAX_LOG_LINES) {
      return logs
    }
    return logs.slice(-MAX_LOG_LINES)
  }, [logs])

  const pairingAddresses = commsState?.lanAddresses ?? []

  const localSessionId = useLocalSessionId()
  const localParticipant = useParticipant(localSessionId)
  const isScreenPreviewReady = localParticipant?.tracks?.screenVideo?.state === 'playable'
  const waitingForScreenFrame = derivedScreenStatus === 'sharing' && !isScreenPreviewReady
  const stageMessage = waitingForScreenFrame
    ? 'Daily is preparing your screen feed…'
    : 'Select a source and start screen sharing to preview your broadcast.'

  const isScreenShareActive = derivedScreenStatus === 'sharing'
  const isLivestreamActive = derivedLiveStatus === 'live'

  return (
    <AppShell>
      <HiddenAudio>
        <DailyAudio autoSubscribeActiveSpeaker playLocalScreenAudio />
      </HiddenAudio>
      <Header>
        <div>
          <Title>Sonic Broadcast Desktop</Title>
          <Tagline>Broadcast • Control • Stream</Tagline>
        </div>
        <HeaderStatusGroup>
          <StatusPill $state={commsError ? 'error' : commsLoading ? 'warning' : 'success'}>
            {commsStatusLabel}
          </StatusPill>
          <StatusPill $state={derivedDailyStatus === 'joined' ? 'success' : 'warning'}>
            Daily: {derivedDailyStatus.toUpperCase()}
          </StatusPill>
          <StatusPill $state={isScreenShareActive ? 'success' : 'default'}>
            Screen Share: {derivedScreenStatus.toUpperCase()}
          </StatusPill>
          <StatusPill $state={isLivestreamActive ? 'success' : 'default'}>
            Livestream: {derivedLiveStatus.toUpperCase()}
          </StatusPill>
        </HeaderStatusGroup>
      </Header>

      <Body>
        <Sidebar>
          

          <Panel>
            <PanelHeading>Livestream Settings</PanelHeading>
            <FieldGroup>
              <label htmlFor="rtmpUrl">RTMP URL</label>
              <Input
                id="rtmpUrl"
                placeholder="rtmp://a.rtmp.youtube.com/live2"
                value={livestream.rtmpUrl}
                onChange={(event) => setLivestreamConfig({ rtmpUrl: event.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <label htmlFor="streamKey">Stream Key</label>
              <Input
                id="streamKey"
                type="password"
                placeholder="Streaming key"
                value={livestream.streamKey}
                onChange={(event) => setLivestreamConfig({ streamKey: event.target.value })}
              />
            </FieldGroup>
            <ButtonRow>
              <PrimaryButton disabled={isLivestreamActive || !isJoined} onClick={() => void startLivestream()}>
                Go Live
              </PrimaryButton>
              <GhostButton disabled={!isLivestreamActive} onClick={() => void stopLivestream()}>
                Stop Live
              </GhostButton>
            </ButtonRow>
          </Panel>

          <Panel>
            <PanelHeading>Screen Sources</PanelHeading>
            <ButtonRow>
              <GhostButton onClick={() => void refreshSources()} disabled={sourcesLoading}>
                Refresh Sources
              </GhostButton>
            </ButtonRow>
            {sourcesError && <InlineError>{sourcesError}</InlineError>}
            <SourceList>
              {sources.map((source) => (
                <SourceItem
                  key={source.id}
                  onClick={() => handleSelectSource(source)}
                  $selected={source.id === selectedSourceId}
                >
                  {source.thumbnail ? <SourceThumbnail src={source.thumbnail} alt={source.name} /> : <SourcePlaceholder />}
                  <SourceMeta>
                    <SourceName>{source.name}</SourceName>
                    <SourceType>{source.type === 'screen' ? 'Screen' : 'Window'}</SourceType>
                  </SourceMeta>
                </SourceItem>
              ))}
              {!sources.length && !sourcesLoading && <EmptyState>No sources detected</EmptyState>}
            </SourceList>
            <ButtonRow>
              <PrimaryButton disabled={!sources.length || isScreenShareActive} onClick={() => void startScreenShare()}>
                Start Share
              </PrimaryButton>
              <GhostButton disabled={!isScreenShareActive} onClick={() => void stopScreenShare()}>
                Stop Share
              </GhostButton>
            </ButtonRow>
          </Panel>
        </Sidebar>

        <StageArea>
          <StageHeader>
            <StageTitle>Broadcast Preview</StageTitle>
            <StageStatusBar>
              <StatusDot $state={isJoined ? 'success' : 'warning'} />
              <span>{isJoined ? 'Connected to Daily room' : 'Awaiting room join'}</span>
            </StageStatusBar>
          </StageHeader>
          <StageContent>
            <StageSurface>
              {isScreenPreviewReady ? (
                <StagePreviewVideo
                  sessionId={localSessionId}
                  type="screenVideo"
                  fit="contain"
                  muted={isPreviewMuted}
                  autoPlay
                />
              ) : (
                <StagePlaceholder>
                  <StagePlaceholderContent>
                    <PlaceholderIcon>🖥️</PlaceholderIcon>
                    <p>{stageMessage}</p>
                  </StagePlaceholderContent>
                </StagePlaceholder>
              )}
            </StageSurface>

            <InfoPanels>
              <Panel>
                <PanelHeading>Pairing Codes</PanelHeading>
                <ToggleRow>
                  <ToggleLabel>
                    Preview Audio
                  </ToggleLabel>
                  <ToggleButton
                    type="button"
                    $active={!isPreviewMuted}
                    onClick={() => setPreviewMuted(!isPreviewMuted)}
                  >
                    {isPreviewMuted ? 'Muted' : 'Unmuted'}
                  </ToggleButton>
                </ToggleRow>
                <FieldHint>Toggles sound coming from the screen capture preview.</FieldHint>
                {commsError && <InlineError>{commsError}</InlineError>}
                <PairingList>
                  {pairingAddresses.map((address) => (
                    <PairingRow key={address}>
                      <PairingLabel>LAN</PairingLabel>
                      <PairingValue>{address}</PairingValue>
                    </PairingRow>
                  ))}
                  {!pairingAddresses.length && !commsError && <EmptyState>LAN details unavailable yet</EmptyState>}
                </PairingList>
              </Panel>

              <Panel>
                <PanelHeading>Activity Log</PanelHeading>
                <LogsContainer>
                  {truncatedLogs.map((entry) => (
                    <LogLine key={entry.id} $level={entry.level}>
                      <LogTimestamp>{new Date(entry.timestamp).toLocaleTimeString()}</LogTimestamp>
                      <LogMessage>{entry.message}</LogMessage>
                    </LogLine>
                  ))}
                  {!truncatedLogs.length && <EmptyState>No activity yet</EmptyState>}
                </LogsContainer>
              </Panel>
            </InfoPanels>
          </StageContent>
        </StageArea>
      </Body>
    </AppShell>
  )
}

const AppShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: radial-gradient(circle at top left, rgba(192, 22, 43, 0.25), transparent 55%),
    ${({ theme }) => theme.colors.backgroundPrimary};
`

const HiddenAudio = styled.div`
  width: 0;
  height: 0;
  overflow: hidden;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);
  background: linear-gradient(135deg, rgba(192, 22, 43, 0.8), rgba(18, 18, 23, 0.9));
`

const HeaderStatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const Title = styled.h1`
  margin: 0;
  font-size: 1.875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Tagline = styled.p`
  margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
`

const Body = styled.main`
  flex: 1;
  display: grid;
  grid-template-columns: minmax(340px, 380px) 1fr;
  gap: 24px;
  padding: 24px 32px 32px;
  min-height: 0;
`

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  padding-right: 8px;
  height: 100%;
  min-height: 0;
  scrollbar-gutter: stable;
`

const StageArea = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  min-height: 0;
  height: 100%;
`

const StageContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  padding-right: 8px;
  scrollbar-gutter: stable;
`

const Panel = styled.section`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.layout.borderRadius};
  padding: 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38);
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const PanelHeading = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  letter-spacing: 0.05em;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`


const FieldHint = styled.p`
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0.04em;
`


const Input = styled.input`
  background: ${({ theme }) => theme.colors.backgroundRaised};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 10px 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.95rem;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 0;
  }
`

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const ToggleLabel = styled.span`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const ToggleButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent : 'transparent')};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.textSecondary)};
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`

const ButtonBase = styled.button`
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
    transform: none;
    box-shadow: none;
  }
`

const PrimaryButton = styled(ButtonBase)`
  background: ${({ theme }) => theme.colors.accent};
  color: #fff;
  box-shadow: 0 8px 18px rgba(192, 22, 43, 0.35);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(192, 22, 43, 0.45);
  }
`

const GhostButton = styled(ButtonBase)`
  background: transparent;
  color: ${({ theme }) => theme.colors.textPrimary};
  border-color: ${({ theme }) => theme.colors.border};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.accent};
  }
`

const StageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const StageTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  letter-spacing: 0.08em;
`

const StageStatusBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.85rem;
`

const StageSurface = styled.div`
  position: relative;
  flex: 1 0 360px;
  min-height: 360px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
`

const StagePreviewVideo = styled(DailyVideo)`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
`

const StagePlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const StagePlaceholderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  max-width: 320px;
`

const PlaceholderIcon = styled.span`
  font-size: 2.5rem;
`

const InfoPanels = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
`

const LogsContainer = styled.div`
  background: ${({ theme }) => theme.colors.backgroundRaised};
  border-radius: 12px;
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const LogLine = styled.article<{ $level: 'info' | 'success' | 'warning' | 'error' }>`
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  border-left: 4px solid
    ${({ $level, theme }) =>
      $level === 'error'
        ? theme.colors.danger
        : $level === 'warning'
        ? theme.colors.warning
        : $level === 'success'
        ? theme.colors.success
        : theme.colors.info};
  padding-left: 12px;
`

const LogTimestamp = styled.time`
  color: ${({ theme }) => theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
`

const LogMessage = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
`

const SourceList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
`

const SourceItem = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: ${({ theme }) => theme.colors.backgroundRaised};
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.accent : theme.colors.border)};
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: ${({ $selected }) => ($selected ? '0 0 0 1px rgba(192, 22, 43, 0.45)' : 'none')};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`

const SourceThumbnail = styled.img`
  width: 100%;
  border-radius: 8px;
`

const SourcePlaceholder = styled.div`
  width: 100%;
  padding-top: 56%;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  position: relative;

  &::after {
    content: 'No Preview';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.75rem;
  }
`

const SourceMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SourceName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
`

const SourceType = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
`

const EmptyState = styled.div`
  text-align: center;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 16px 0;
`

const InlineError = styled.div`
  background: rgba(255, 79, 77, 0.12);
  border: 1px solid rgba(255, 79, 77, 0.4);
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.danger};
  padding: 10px 12px;
  font-size: 0.85rem;
`

const StatusPill = styled.span<{ $state: 'success' | 'warning' | 'error' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textPrimary};
  background:
    ${({ $state }) => {
      switch ($state) {
        case 'success':
          return 'rgba(50, 205, 112, 0.18)'
        case 'error':
          return 'rgba(255, 79, 77, 0.18)'
        case 'warning':
          return 'rgba(255, 179, 71, 0.18)'
        default:
          return 'rgba(255, 255, 255, 0.08)'
      }
    }};
  border: 1px solid
    ${({ $state, theme }) => {
      switch ($state) {
        case 'success':
          return 'rgba(50, 205, 112, 0.45)'
        case 'error':
          return 'rgba(255, 79, 77, 0.45)'
        case 'warning':
          return 'rgba(255, 179, 71, 0.45)'
        default:
          return theme.colors.border
      }
    }};
`

const StatusDot = styled.span<{ $state: 'success' | 'warning' | 'error' }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background:
    ${({ $state, theme }) => {
      switch ($state) {
        case 'success':
          return theme.colors.success
        case 'error':
          return theme.colors.danger
        default:
          return theme.colors.warning
      }
    }};
  box-shadow: 0 0 10px
    ${({ $state, theme }) => {
      switch ($state) {
        case 'success':
          return theme.colors.success
        case 'error':
          return theme.colors.danger
        default:
          return theme.colors.warning
      }
    }};
`

const PairingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const PairingRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 12px;
  align-items: center;
`

const PairingLabel = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.textMuted};
`

const PairingValue = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textPrimary};
`

export default BroadcastApp
