import React from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle, faCheckCircle, faInfoCircle, faXmark, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';

/**
 * A reusable confirmation modal component with different types: 
 * warning, success, error, info, danger, loading
 */
const ConfirmationModal = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  type = "warning" // warning, success, error, info, danger, loading
}) => {
  // Determine the icon and colors based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: faCheckCircle,
          color: '#10B981', // green-500
          bgColor: '#D1FAE5', // green-50
          buttonBg: '#10B981', // green-500
          buttonText: 'white'
        };
      case 'error':
        return {
          icon: faXmark,
          color: '#EF4444', // red-500
          bgColor: '#FEE2E2', // red-50
          buttonBg: '#EF4444', // red-500
          buttonText: 'white'
        };
      case 'info':
        return {
          icon: faInfoCircle,
          color: '#3B82F6', // blue-500
          bgColor: '#EFF6FF', // blue-50
          buttonBg: '#3B82F6', // blue-500
          buttonText: 'white'
        };
      case 'danger':
        return {
          icon: faExclamationCircle,
          color: '#DC2626', // red-600
          bgColor: '#FEF2F2', // red-50
          buttonBg: '#DC2626', // red-600
          buttonText: 'white'
        };
      case 'loading':
        return {
          color: '#3B82F6', // blue-500
          bgColor: '#EFF6FF', // blue-50
          buttonBg: '#3B82F6', // blue-500
          buttonText: 'white'
        };
      case 'warning':
      default:
        return {
          icon: faExclamationTriangle,
          color: '#F59E0B', // amber-500
          bgColor: '#FFFBEB', // amber-50
          buttonBg: '#F59E0B', // amber-500
          buttonText: 'white'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View className="bg-white w-full max-w-sm rounded-lg shadow-xl overflow-hidden">
              {/* Header with colored background */}
              <View style={{ backgroundColor: styles.bgColor }} className="p-4 items-center">
                {type === 'loading' ? (
                  <ActivityIndicator size="large" color={styles.color} />
                ) : (
                  <FontAwesomeIcon icon={styles.icon} size={48} color={styles.color} />
                )}
                <Text className="text-lg font-bold mt-2" style={{ color: styles.color }}>
                  {title}
                </Text>
              </View>

              {/* Message body */}
              <View className="p-4">
                <Text className="text-center text-gray-700">{message}</Text>
              </View>

              {/* Buttons */}
              <View className="flex-row border-t border-gray-200 divide-x divide-gray-200">
                {type !== 'loading' && onCancel && (
                  <TouchableOpacity
                    className="flex-1 p-4 items-center"
                    onPress={onCancel}
                  >
                    <Text className="text-gray-600 font-medium">{cancelText}</Text>
                  </TouchableOpacity>
                )}
                
                {type !== 'loading' && onConfirm && (
                  <TouchableOpacity
                    className="flex-1 p-4 items-center"
                    style={{ backgroundColor: styles.buttonBg }}
                    onPress={onConfirm}
                  >
                    <Text className="font-medium" style={{ color: styles.buttonText }}>
                      {confirmText}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* For information-only modals with just an OK button */}
                {(type === 'info' || type === 'success' || type === 'error') && !onConfirm && (
                  <TouchableOpacity
                    className="flex-1 p-4 items-center"
                    style={{ backgroundColor: styles.buttonBg }}
                    onPress={onCancel}
                  >
                    <Text className="font-medium" style={{ color: styles.buttonText }}>
                      OK
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

ConfirmationModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  type: PropTypes.oneOf(['warning', 'success', 'error', 'info', 'danger', 'loading'])
};

export default ConfirmationModal;
