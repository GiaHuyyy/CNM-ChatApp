import React from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';

const CustomSlider = ({
    value = 0,
    minimumValue = 0,
    maximumValue = 1,
    step = 0.01,
    onValueChange,
    minimumTrackTintColor = '#3b82f6',
    maximumTrackTintColor = '#6b7280',
    thumbTintColor = '#3b82f6',
    style,
}) => {
    const [width, setWidth] = React.useState(0);
    const [currentValue, setCurrentValue] = React.useState(value);

    React.useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => { },
            onPanResponderMove: (_, gestureState) => {
                if (width === 0) return;

                // Calculate the new value based on the drag position
                let newValue = ((gestureState.moveX - 30) / width) * (maximumValue - minimumValue) + minimumValue;

                // Clamp the value between min and max
                newValue = Math.max(minimumValue, Math.min(maximumValue, newValue));

                // Apply step if needed
                if (step) {
                    newValue = Math.round(newValue / step) * step;
                }

                setCurrentValue(newValue);
                if (onValueChange) {
                    onValueChange(newValue);
                }
            },
            onPanResponderRelease: () => { },
        })
    ).current;

    const getThumbPosition = () => {
        if (width === 0) return 0;
        const position = ((currentValue - minimumValue) / (maximumValue - minimumValue)) * width;
        return Math.max(0, Math.min(position, width));
    };

    return (
        <View
            style={[styles.container, style]}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width - 20)}
        >
            <View style={styles.track}>
                <View style={[
                    styles.minimumTrack,
                    { width: getThumbPosition(), backgroundColor: minimumTrackTintColor }
                ]} />
                <View style={[
                    styles.remainingTrack,
                    { width: width - getThumbPosition(), backgroundColor: maximumTrackTintColor }
                ]} />
            </View>
            <View
                style={[
                    styles.thumb,
                    {
                        left: getThumbPosition() - 10,
                        backgroundColor: thumbTintColor
                    }
                ]}
                {...panResponder.panHandlers}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 40,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    track: {
        height: 4,
        flexDirection: 'row',
    },
    minimumTrack: {
        height: '100%',
    },
    remainingTrack: {
        height: '100%',
    },
    thumb: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
});

export default CustomSlider;
