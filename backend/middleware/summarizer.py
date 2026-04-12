from fastapi import Request

class SummarizerMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, request: Request, call_next):
        response = self.app(request)
        return response