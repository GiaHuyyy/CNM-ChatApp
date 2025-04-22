import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ConfirmationModal = ({ visible, title, message, onConfirm, onCancel, type = 'danger' }) => {
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <FontAwesomeIcon
                            icon={type === 'danger' ? faTrash : faExclamationTriangle}
                            size={24}
                            color={type === 'danger' ? '#dc3545' : '#ffc107'}
                        />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton,
                            type === 'danger' ? styles.dangerButton : styles.warningButton]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmButtonText}>
                                {type === 'danger' ? 'Xóa' : 'Đồng ý'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        minWidth: '40%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    confirmButton: {
        backgroundColor: '#dc3545',
    },
    dangerButton: {
        backgroundColor: '#dc3545',
    },
    warningButton: {
        backgroundColor: '#ffc107',
    },
    cancelButtonText: {
        color: '#495057',
        fontWeight: '600',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});

ConfirmationModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['danger', 'warning']),
};

export default ConfirmationModal;
