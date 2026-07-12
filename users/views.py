from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    # PRD 3.1 mandates email+password login. C's frontend already calls this
    # with { email, password } (see frontend/src/api/auth.js) — not username,
    # despite TASKS.md's generic { username, password } contract.
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = User.objects.filter(email=email).first()
        if user is None or not user.check_password(password):
            return Response(
                {"reason": "invalid_credentials", "code": "invalid_credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})
