from rest_framework import serializers
from .models import User
import re

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirmation = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'identification_number', 'first_name', 'last_name',
            'gender', 'phone', 'date_of_birth', 'password', 'password_confirmation'
        ]
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return value
    
    def validate_identification_number(self, value):
        if User.objects.filter(identification_number=value).exists():
            raise serializers.ValidationError("Este número de identificación ya está registrado.")
        return value
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("La contraseña debe contener al menos una mayúscula.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("La contraseña debe contener al menos una minúscula.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("La contraseña debe contener al menos un número.")
        return value
    
    def validate(self, data):
        if data.get('password') != data.get('password_confirmation'):
            raise serializers.ValidationError({"password_confirmation": "Las contraseñas no coinciden."})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirmation')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            **validated_data,
            password=password
        )
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'identification_number', 'first_name', 'last_name',
            'gender', 'phone', 'date_of_birth', 'role', 'is_active'
        ]
        read_only_fields = ['id', 'role', 'is_active']