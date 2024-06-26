import dayjs from 'dayjs'
import React from 'react'
import { Animated, TextStyle, ViewStyle } from 'react-native'

import { MIN_HEIGHT } from '../commonStyles'
import {
  DateRangeHandler,
  EventCellStyle,
  EventRenderer,
  HeaderRenderer,
  HorizontalDirection,
  ICalendarEventBase,
  LayoutRectangleExtended,
  Mode,
  MonthHeaderRenderer,
  WeekNum,
} from '../interfaces'
import { useTheme } from '../theme/ThemeContext'
import {
  getDatesInMonth,
  getDatesInNextCustomDays,
  getDatesInNextOneDay,
  getDatesInNextThreeDays,
  getDatesInWeek,
  isAllDayEvent,
  modeToNum,
  typedMemo,
} from '../utils'
import { CalendarBody } from './CalendarBody'
import { CalendarBodyForMonthView } from './CalendarBodyForMonthView'
import { CalendarHeader } from './CalendarHeader'
import { CalendarHeaderForMonthView } from './CalendarHeaderForMonthView'

export interface CalendarContainerProps<T extends ICalendarEventBase> {
  /**
   * Events to be rendered. This is a required prop.
   */
  events: T[]

  /**
   * The height of calendar component. This is a required prop.
   */
  height: number

  /**
   * The height of each hour row.
   */
  hourRowHeight?: number

  /**
   * Adjusts the indentation of events that occur during the same time period. Defaults to 20 on web and 8 on mobile.
   */
  overlapOffset?: number

  // Custom style
  eventCellStyle?: EventCellStyle<T>
  calendarContainerStyle?: ViewStyle
  headerContainerStyle?: ViewStyle
  headerContentStyle?: ViewStyle
  dayHeaderStyle?: ViewStyle
  dayHeaderHighlightColor?: string
  weekDayHeaderHighlightColor?: string
  bodyContainerStyle?: ViewStyle

  // Custom renderer
  renderEvent?: EventRenderer<T>
  renderHeader?: HeaderRenderer<T>
  renderHeaderForMonthView?: MonthHeaderRenderer

  ampm?: boolean
  date?: Date
  locale?: string
  hideNowIndicator?: boolean
  mode?: Mode
  scrollOffsetMinutes?: number
  showTime?: boolean

  swipeEnabled?: boolean
  weekStartsOn?: WeekNum
  onChangeDate?: DateRangeHandler
  onPressCell?: (date: Date) => void
  onPressDateHeader?: (date: Date) => void
  onPressEvent?: (event: T) => void
  weekEndsOn?: WeekNum
  maxVisibleEventCount?: number
  eventMinHeightForMonthView?: number
  activeDate?: Date
  headerComponent?: React.ReactElement | null
  hourStyle?: TextStyle
  showAllDayEventCell?: boolean
  showHeaderPan?: boolean
  panLeftContainerStyle?: ViewStyle
  panLeftStyle?: TextStyle
  panLeftComponent?: React.ReactElement | null
  panRightContainerStyle?: ViewStyle
  panRightStyle?: TextStyle
  panRightComponent?: React.ReactElement | null
  topHeaderComponent?: React.ReactElement | null
  showWeekDayModes?: Mode[]
  showWeekDayInnerModes?: Mode[]
  showShortWeekDayModes?: Mode[]
  weekDayStyle?: TextStyle
  datesArrayStyle?: ViewStyle
  showDatesArrayStyleModes?: Mode[]
  cellsBorderStyle?: ViewStyle
  fullHeaderStyle?: ViewStyle
  fullBodyStyle?: ViewStyle
  increaseFirstRowHeight?: number
  animatePan?: boolean
  fadeInDuration?: number
  contentItemsContainerStyle?: ViewStyle
}

function _CalendarContainer<T extends ICalendarEventBase>({
  events,
  height,
  hourRowHeight,
  ampm = false,
  date,
  eventCellStyle,
  locale = 'en',
  hideNowIndicator = false,
  mode = 'week',
  overlapOffset,
  scrollOffsetMinutes = 0,
  showTime = true,
  headerContainerStyle = {},
  headerContentStyle = {},
  dayHeaderStyle = {},
  dayHeaderHighlightColor = '',
  weekDayHeaderHighlightColor = '',
  bodyContainerStyle = {},
  swipeEnabled = true,
  weekStartsOn = 0,
  onChangeDate,
  onPressCell,
  onPressDateHeader,
  onPressEvent,
  renderEvent,
  renderHeader: HeaderComponent = CalendarHeader,
  renderHeaderForMonthView: HeaderComponentForMonthView = CalendarHeaderForMonthView,
  weekEndsOn = 6,
  maxVisibleEventCount = 3,
  eventMinHeightForMonthView = 22,
  activeDate,
  headerComponent = null,
  hourStyle = {},
  showAllDayEventCell = true,
  showHeaderPan = false,
  panLeftContainerStyle = {},
  panLeftStyle = {},
  panLeftComponent = null,
  panRightContainerStyle = {},
  panRightStyle = {},
  panRightComponent = null,
  topHeaderComponent = null,
  showWeekDayModes = ['3days', 'custom', 'day', 'month', 'week'],
  showWeekDayInnerModes = [],
  showShortWeekDayModes = [],
  weekDayStyle = {},
  datesArrayStyle = {},
  showDatesArrayStyleModes = [],
  cellsBorderStyle = {},
  fullHeaderStyle = {},
  fullBodyStyle = {},
  increaseFirstRowHeight = 1,
  animatePan = false,
  fadeInDuration = 0,
  contentItemsContainerStyle = {},
}: CalendarContainerProps<T>) {
  const [targetDate, setTargetDate] = React.useState(dayjs(date))
  const [showWeekDay, setShowWeekDay] = React.useState(true)
  const [showWeekDayInner, setShowWeekDayInner] = React.useState(false)
  const [showShortWeekDay, setShowShortWeekDay] = React.useState(false)
  const [showDatesArrayStyle, setShowDatesArrayStyle] = React.useState(false)
  const presentFadeAnim = React.useRef(new Animated.Value(1)).current
  const presentLeftValue = React.useRef(new Animated.Value(0)).current
  const leftValue = React.useRef<LayoutRectangleExtended>()
  const currentPresentLeftVal = React.useRef<number>()

  React.useEffect(() => {
    if (date) {
      setTargetDate(dayjs(date))
    }
  }, [date])

  const allDayEvents = React.useMemo(
    () => events.filter((event) => isAllDayEvent(event.start, event.end)),
    [events],
  )

  const daytimeEvents = React.useMemo(
    () => events.filter((event) => !isAllDayEvent(event.start, event.end)),
    [events],
  )

  const dateRange = React.useMemo(() => {
    switch (mode) {
      case 'month':
        return getDatesInMonth(targetDate, locale)
      case 'week':
        return getDatesInWeek(targetDate, weekStartsOn, locale)
      case '3days':
        return getDatesInNextThreeDays(targetDate, locale)
      case 'day':
        return getDatesInNextOneDay(targetDate, locale)
      case 'custom':
        return getDatesInNextCustomDays(targetDate, weekStartsOn, weekEndsOn, locale)
      default:
        throw new Error(
          `[react-native-big-calendar] The mode which you specified "${mode}" is not supported.`,
        )
    }
  }, [mode, targetDate, locale, weekEndsOn, weekStartsOn])

  React.useEffect(() => {
    if (onChangeDate) {
      onChangeDate([dateRange[0].toDate(), dateRange.slice(-1)[0].toDate()])
    }
  }, [dateRange, onChangeDate])

  const cellHeight = React.useMemo(
    () => hourRowHeight || Math.max(height - 30, MIN_HEIGHT) / 24,
    [height, hourRowHeight],
  )

  React.useEffect(() => {
    if (mode != null) {
      if (showWeekDayModes != null) setShowWeekDay(showWeekDayModes.includes(mode))
      if (showWeekDayInnerModes != null) setShowWeekDayInner(showWeekDayInnerModes.includes(mode))
      if (showShortWeekDayModes != null) setShowShortWeekDay(showShortWeekDayModes.includes(mode))
      if (showDatesArrayStyleModes != null)
        setShowDatesArrayStyle(showDatesArrayStyleModes.includes(mode))
    }
  }, [
    mode,
    showWeekDayModes,
    showWeekDayInnerModes,
    showShortWeekDayModes,
    showDatesArrayStyleModes,
  ])

  const theme = useTheme()

  const handleLeftValue = (layout: LayoutRectangleExtended) => {
    leftValue.current = layout
  }

  React.useEffect(() => {
    const idpres = presentLeftValue.addListener((value) => {
      currentPresentLeftVal.current = value?.value
    })
    return () => {
      presentLeftValue.removeListener(idpres)
    }
  }, [presentLeftValue])

  const movePrevBody = () => {
    const width = leftValue.current?.width || 0

    // move to the left and hide
    Animated.timing(presentLeftValue, {
      toValue: width,
      duration: fadeInDuration,
      useNativeDriver: false,
    }).start()
    Animated.timing(presentFadeAnim, {
      toValue: 0,
      duration: fadeInDuration,
      useNativeDriver: false,
    }).start(() => {
      // move quickly to the right to the starting point
      Animated.timing(presentLeftValue, {
        toValue: 0,
        duration: 0.01,
        useNativeDriver: false,
      }).start(() => {
        Animated.timing(presentLeftValue, {
          toValue: -1 * width,
          duration: 0.01,
          useNativeDriver: false,
        }).start(() => {
          // show
          Animated.timing(presentLeftValue, {
            toValue: 0,
            duration: fadeInDuration,
            useNativeDriver: false,
          }).start()
          Animated.timing(presentFadeAnim, {
            toValue: 1,
            duration: fadeInDuration,
            useNativeDriver: false,
          }).start()
        })
      })
    })
  }

  const moveNextBody = () => {
    const width = leftValue.current?.width || 0

    // move to the right and hide
    Animated.timing(presentLeftValue, {
      toValue: -1 * width,
      duration: fadeInDuration,
      useNativeDriver: false,
    }).start()
    Animated.timing(presentFadeAnim, {
      toValue: 0,
      duration: fadeInDuration,
      useNativeDriver: false,
    }).start(() => {
      // move quickly to the left to the starting point
      Animated.timing(presentLeftValue, {
        toValue: 0,
        duration: 0.01,
        useNativeDriver: false,
      }).start(() => {
        Animated.timing(presentLeftValue, {
          toValue: width,
          duration: 0.01,
          useNativeDriver: false,
        }).start(() => {
          // show
          Animated.timing(presentLeftValue, {
            toValue: 0,
            duration: fadeInDuration,
            useNativeDriver: false,
          }).start()
          Animated.timing(presentFadeAnim, {
            toValue: 1,
            duration: fadeInDuration,
            useNativeDriver: false,
          }).start()
        })
      })
    })
  }

  const onSwipeHorizontalCallback = React.useCallback(
    (direction: HorizontalDirection) => {
      if (!swipeEnabled) {
        return
      }
      if ((direction === 'LEFT' && !theme.isRTL) || (direction === 'RIGHT' && theme.isRTL)) {
        setTargetDate(targetDate.add(modeToNum(mode, targetDate), 'day'))
      } else {
        setTargetDate(targetDate.add(modeToNum(mode, targetDate) * -1, 'day'))
      }
    },
    [swipeEnabled, targetDate, mode, theme.isRTL],
  )

  const onSwipeHorizontal = (direction: HorizontalDirection) => {
    if (animatePan === true) {
      if ((direction === 'LEFT' && !theme.isRTL) || (direction === 'RIGHT' && theme.isRTL)) {
        moveNextBody()
        // recalculate calendar
        onSwipeHorizontalCallback(direction)
      } else {
        movePrevBody()
        // recalculate calendar
        onSwipeHorizontalCallback(direction)
      }
    } else {
      onSwipeHorizontalCallback(direction)
    }
  }

  const onPanLeft = (direction: HorizontalDirection) => {
    if (animatePan === true) {
      movePrevBody()
      // recalculate calendar
      onSwipeHorizontalCallback(direction)
    } else {
      onSwipeHorizontalCallback(direction)
    }
  }

  const onPanRight = (direction: HorizontalDirection) => {
    if (animatePan === true) {
      moveNextBody()
      // recalculate calendar
      onSwipeHorizontalCallback(direction)
    } else {
      onSwipeHorizontalCallback(direction)
    }
  }

  const commonProps = {
    cellHeight,
    dateRange,
    mode,
    onPressEvent,
  }

  if (mode === 'month') {
    const headerProps = {
      style: headerContainerStyle,
      locale: locale,
      weekStartsOn: weekStartsOn,
      headerContentStyle: headerContentStyle,
      dayHeaderStyle: dayHeaderStyle,
      dayHeaderHighlightColor: dayHeaderHighlightColor,
      weekDayHeaderHighlightColor: weekDayHeaderHighlightColor,
      showAllDayEventCell: showAllDayEventCell,
      showHeaderPan: showHeaderPan,
      panLeft: onPanLeft,
      panRight: onPanRight,
      panLeftContainerStyle: panLeftContainerStyle,
      panLeftStyle: panLeftStyle,
      panLeftComponent: panLeftComponent,
      panRightContainerStyle: panRightContainerStyle,
      panRightStyle: panRightStyle,
      panRightComponent: panRightComponent,
      topHeaderComponent: topHeaderComponent,
      showWeekDay: showWeekDay,
      showWeekDayInner: showWeekDayInner,
      showShortWeekDay: showShortWeekDay,
      weekDayStyle: weekDayStyle,
      datesArrayStyle: datesArrayStyle,
      showDatesArrayStyle: showDatesArrayStyle,
      fullHeaderStyle: fullHeaderStyle,
    }
    return (
      <React.Fragment>
        <HeaderComponentForMonthView {...headerProps} />
        <CalendarBodyForMonthView<T>
          {...commonProps}
          style={bodyContainerStyle}
          containerHeight={height}
          events={[...daytimeEvents, ...allDayEvents]}
          eventCellStyle={eventCellStyle}
          weekStartsOn={weekStartsOn}
          hideNowIndicator={hideNowIndicator}
          onPressCell={onPressCell}
          onPressEvent={onPressEvent}
          onSwipeHorizontal={onSwipeHorizontal}
          renderEvent={renderEvent}
          targetDate={targetDate}
          maxVisibleEventCount={maxVisibleEventCount}
          eventMinHeightForMonthView={eventMinHeightForMonthView}
        />
      </React.Fragment>
    )
  }

  const headerProps = {
    ...commonProps,
    style: headerContainerStyle,
    allDayEvents: allDayEvents,
    onPressDateHeader: onPressDateHeader,
    activeDate,
    headerContentStyle: headerContentStyle,
    dayHeaderStyle: dayHeaderStyle,
    dayHeaderHighlightColor: dayHeaderHighlightColor,
    weekDayHeaderHighlightColor: weekDayHeaderHighlightColor,
    showAllDayEventCell: showAllDayEventCell,
    showHeaderPan: showHeaderPan,
    panLeft: onPanLeft,
    panRight: onPanRight,
    panLeftContainerStyle: panLeftContainerStyle,
    panLeftStyle: panLeftStyle,
    panLeftComponent: panLeftComponent,
    panRightContainerStyle: panRightContainerStyle,
    panRightStyle: panRightStyle,
    panRightComponent: panRightComponent,
    topHeaderComponent: topHeaderComponent,
    showWeekDay: showWeekDay,
    showWeekDayInner: showWeekDayInner,
    showShortWeekDay: showShortWeekDay,
    weekDayStyle: weekDayStyle,
    datesArrayStyle: datesArrayStyle,
    showDatesArrayStyle: showDatesArrayStyle,
    fullHeaderStyle: fullHeaderStyle,
  }

  return (
    <React.Fragment>
      <HeaderComponent {...headerProps} />
      <CalendarBody
        {...commonProps}
        style={bodyContainerStyle}
        containerHeight={height}
        events={daytimeEvents}
        eventCellStyle={eventCellStyle}
        hideNowIndicator={hideNowIndicator}
        overlapOffset={overlapOffset}
        scrollOffsetMinutes={scrollOffsetMinutes}
        ampm={ampm}
        showTime={showTime}
        onPressCell={onPressCell}
        onPressEvent={onPressEvent}
        onSwipeHorizontal={onSwipeHorizontal}
        renderEvent={renderEvent}
        headerComponent={headerComponent}
        hourStyle={hourStyle}
        cellsBorderStyle={cellsBorderStyle}
        fullBodyStyle={fullBodyStyle}
        increaseFirstRowHeight={increaseFirstRowHeight}
        animatePan={animatePan}
        presentFadeAnim={presentFadeAnim}
        presentLeftValue={presentLeftValue}
        handleLeftValue={handleLeftValue}
        contentItemsContainerStyle={contentItemsContainerStyle}
      />
    </React.Fragment>
  )
}

export const CalendarContainer = typedMemo(_CalendarContainer)
